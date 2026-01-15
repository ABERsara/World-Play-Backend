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

  async startStream(streamId, inputPipe) {
    if (activeStreams.has(streamId)) {
      throw new Error('Stream already exists');
    }

    const streamPath = path.join(TEMP_DIR, streamId);
    const tempVideoPath = path.join(streamPath, 'input.mp4');

    if (!fs.existsSync(streamPath)) {
      fs.mkdirSync(streamPath, { recursive: true });
    }

    console.log(`🎬 Starting stream: ${streamId}`);

    // *** שלב 1: שמירת הוידאו לקובץ זמני ***
    const writeStream = fs.createWriteStream(tempVideoPath);
    let totalBytes = 0;

    inputPipe.on('data', (chunk) => {
      totalBytes += chunk.length;
      const mb = (totalBytes / 1024 / 1024).toFixed(2);
      process.stdout.write(`\r💾 Saving video: ${mb} MB`);
    });

    inputPipe.pipe(writeStream);

    // *** שלב 2: כשהקובץ נשמר - הפעל FFmpeg ***
    writeStream.on('finish', async () => {
      console.log(
        `\n✅ Video saved: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(`🎬 Starting FFmpeg processing...`);

      const ffmpeg = spawn('ffmpeg', [
        '-re',
        '-i',
        tempVideoPath,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-f',
        'hls',
        '-hls_time',
        '4',
        '-hls_list_size',
        '0', // שמור את כל הסגמנטים!
        '-hls_flags',
        'append_list', // ללא delete_segments
        '-hls_segment_filename',
        path.join(streamPath, 'segment_%03d.ts'),
        path.join(streamPath, 'index.m3u8'),
      ]);

      ffmpeg.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('time=')) {
          const time = msg.match(/time=(\S+)/)?.[1] || '00:00:00';
          process.stdout.write(`\r🎬 Processing: ${time}`);
        } else if (msg.includes('error') || msg.includes('Invalid')) {
          console.error(`\n❌ FFmpeg Error: ${msg.trim()}`);
        }
      });

      ffmpeg.on('close', (code) => {
        console.log(`\n🏁 FFmpeg finished with code ${code}`);

        // מחיקת קובץ הזמני בלבד (לא את כל התיקייה!)
        try {
          if (fs.existsSync(tempVideoPath)) {
            fs.unlinkSync(tempVideoPath);
            console.log(`🗑️ Temp input file deleted`);
          }
        } catch (err) {
          console.warn(`⚠️ Could not delete temp file: ${err.message}`);
        }

        // שמירת הסטרים ב-Map עם סטטוס "completed"
        const streamData = activeStreams.get(streamId);
        if (streamData) {
          streamData.status = 'completed';
          streamData.completedAt = Date.now();
          console.log(`✅ Stream ${streamId} completed and files preserved`);
        }
      });

      activeStreams.set(streamId, {
        ffmpeg,
        startTime: Date.now(),
        streamPath,
      });

      await this.notifyBackend(streamId, 'LIVE');
      console.log(`\n✅ Stream ${streamId} is now LIVE`);
      console.log(
        `📺 Watch at: http://localhost:8000/hls/${streamId}/index.m3u8`
      );
    });

    writeStream.on('error', (err) => {
      console.error(`❌ Write stream error:`, err);
      throw err;
    });

    inputPipe.on('error', (err) => {
      console.error(`❌ Input pipe error:`, err);
      writeStream.destroy();
    });
  },

  stopStream(streamId) {
    const stream = activeStreams.get(streamId);
    if (stream && stream.ffmpeg) {
      stream.ffmpeg.kill('SIGTERM');
      activeStreams.delete(streamId);
      console.log(`🛑 Stream ${streamId} stopped manually.`);
    }
  },
};
