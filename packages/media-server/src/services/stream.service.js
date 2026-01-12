import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch'; // ודאי שהספרייה מותקנת ב-media-server

const TEMP_DIR = '/usr/src/app/packages/media-server/media_files';
const activeStreams = new Map();

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const StreamService = {
  getActiveStreams: () => activeStreams,
  getTempDir: () => TEMP_DIR,

  // פונקציית עזר לעדכון הבאקנד
  async notifyBackend(streamId, status) {
    try {
      const response = await fetch(
        'http://app-server:8080/api/streams/update-status-from-server',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamId, status }),
        }
      );
      if (response.ok) {
        console.log(`📡 Backend updated: ${streamId} is ${status}`);
      } else {
        console.error(`⚠️ Backend returned error for ${streamId}`);
      }
    } catch (err) {
      console.error(
        `❌ Failed to notify Backend for ${streamId}:`,
        err.message
      );
    }
  },

  async startStream(streamId, inputPipe, res) {
    if (activeStreams.has(streamId)) {
      throw new Error('Stream already exists');
    }

    const streamPath = path.join(TEMP_DIR, streamId);
    if (!fs.existsSync(streamPath)) {
      fs.mkdirSync(streamPath, { recursive: true });
    }

    console.log(`🎬 Creating files in: ${streamPath}`);

    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-c:a',
      'aac',
      '-f',
      'hls',
      '-hls_time',
      '2',
      '-hls_list_size',
      '5',
      '-hls_flags',
      'append_list',
      '-hls_segment_filename',
      path.join(streamPath, 'segment%03d.ts'),
      path.join(streamPath, 'index.m3u8'),
    ]);

    activeStreams.set(streamId, {
      ffmpeg,
      startTime: Date.now(),
      isPaused: false,
    });

    // ✅ עדכון הבאקנד שהשידור התחיל
    this.notifyBackend(streamId, 'LIVE');

    inputPipe.pipe(ffmpeg.stdin);

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Opening') && output.includes('.ts')) {
        console.log(`📦 FFmpeg: New segment for ${streamId}`);
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(`🛑 Stream ${streamId} closed (code: ${code})`);
      activeStreams.delete(streamId);

      // ✅ עדכון הבאקנד שהשידור הסתיים
      this.notifyBackend(streamId, 'FINISHED');

      if (res && !res.headersSent) {
        res.end();
      }
    });

    inputPipe.on('error', (err) => {
      console.error(`❌ Input pipe error [${streamId}]:`, err.message);
      if (ffmpeg && !ffmpeg.killed) {
        ffmpeg.kill('SIGTERM');
      }
      activeStreams.delete(streamId);
    });
  },

  stopStream(streamId) {
    const stream = activeStreams.get(streamId);
    if (stream && stream.ffmpeg) {
      stream.ffmpeg.kill('SIGTERM');
      // ה-close handler כבר יעדכן את הבאקנד כ-FINISHED
    }
  },
};
