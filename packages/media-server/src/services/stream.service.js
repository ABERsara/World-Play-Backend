import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const TEMP_DIR = '/usr/src/app/packages/media-server/media_files';
const activeStreams = new Map();

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const StreamService = {
  getActiveStreams: () => activeStreams,
  getTempDir: () => TEMP_DIR,

  async notifyBackend(streamId, status) {
    try {
      await fetch(
        'http://app-server:8080/api/streams/update-status-from-server',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamId, status }),
          signal: AbortSignal.timeout(2000),
        }
      );
      console.log(`✅ Backend notified: ${streamId} -> ${status}`);
    } catch (err) {
      console.warn(`⚠️ Backend notification failed: ${err.message}`);
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

    console.log(`🎬 Starting stream: ${streamId}`);
    console.log(`📁 Output directory: ${streamPath}`);

    // FFmpeg לקבלת Stream ויצירת HLS
    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0', // קלט מ-HTTP stream
      '-c:v',
      'libx264', // קידוד H.264
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-c:a',
      'aac', // קידוד AAC
      '-f',
      'hls', // פלט HLS
      '-hls_time',
      '2', // 2 שניות לכל segment
      '-hls_list_size',
      '5', // 5 segments בפלייליסט
      '-hls_flags',
      'delete_segments+append_list',
      '-hls_segment_filename',
      path.join(streamPath, 'segment%03d.ts'),
      path.join(streamPath, 'index.m3u8'),
    ]);

    // שמירה ב-Map
    activeStreams.set(streamId, {
      ffmpeg,
      startTime: Date.now(),
      streamPath,
    });

    // חיבור ה-Stream
    inputPipe.pipe(ffmpeg.stdin);

    // טיפול בלוגים
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Opening') && output.includes('.ts')) {
        console.log(`📦 New segment created for ${streamId}`);
      }
      if (output.includes('error')) {
        console.error(`❌ FFmpeg error [${streamId}]:`, output);
      }
    });

    // סיום
    ffmpeg.on('close', async (code) => {
      console.log(`🛑 Stream ${streamId} ended (code: ${code})`);
      await this.notifyBackend(streamId, 'FINISHED');
      activeStreams.delete(streamId);

      if (res && !res.headersSent) {
        res.end();
      }
    });

    // שגיאות
    inputPipe.on('error', (err) => {
      console.error(`❌ Input error [${streamId}]:`, err.message);
      if (!ffmpeg.killed) {
        ffmpeg.kill('SIGTERM');
      }
    });

    // עדכון Backend
    await this.notifyBackend(streamId, 'LIVE');

    console.log(`✅ Stream ${streamId} is now LIVE`);
    console.log(
      `📺 Watch at: http://localhost:8000/hls/${streamId}/index.m3u8`
    );
  },

  stopStream(streamId) {
    const stream = activeStreams.get(streamId);
    if (stream && stream.ffmpeg) {
      stream.ffmpeg.kill('SIGTERM');
      activeStreams.delete(streamId);
    }
  },
};
