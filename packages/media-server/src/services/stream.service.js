import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
// ייבוא הפונקציות של Mediasoup
import {
  getWorker,
  createRouter,
  createPlainTransport,
} from './mediasoup.service.js';

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

    console.log(`🎬 Starting stream reception: ${streamId}`);

    // --- שלב 1: שמירת הוידאו הנכנס לקובץ זמני ---
    const writeStream = fs.createWriteStream(tempVideoPath);
    let totalBytes = 0;

    inputPipe.on('data', (chunk) => {
      totalBytes += chunk.length;
      const mb = (totalBytes / 1024 / 1024).toFixed(2);
      process.stdout.write(`\r💾 Saving video: ${mb} MB`);
    });

    inputPipe.pipe(writeStream);

    // --- שלב 2: כשהקובץ סיים להישמר, מתחילים את ה-WebRTC וה-FFmpeg ---
    writeStream.on('finish', async () => {
      console.log(`\n✅ Video saved. Initializing WebRTC/Mediasoup...`);

      try {
        const worker = getWorker();
        const router = await createRouter(worker);
        const transport = await createPlainTransport(router);

        const videoRtpPort = transport.tuple.localPort;
        console.log(`✅ Mediasoup transport is ready on port: ${videoRtpPort}`);

        // --- כאן הוספתי את ה-Producer (ההוכחה שזה WebRTC) ---
        // ה-Producer אומר ל-Mediasoup: "תקשיב בפורט הזה, עומד להגיע וידאו"
        const videoProducer = await transport.produce({
          kind: 'video',
          rtpParameters: {
            codecs: [
              {
                mimeType: 'video/h264',
                clockRate: 90000,
                payloadType: 101, // ערך סטנדרטי ל-FFmpeg
                parameters: {
                  'packetization-mode': 1,
                  'profile-level-id': '42e01f',
                },
              },
            ],
            encodings: [{ ssrc: 11111 }], // מספר מזהה לזרם הנתונים
          },
        });

        console.log(`📡 WebRTC Producer created! ID: ${videoProducer.id}`);
        // ---------------------------------------------------

        console.log(`🎬 Starting FFmpeg processing...`);
        const ffmpeg = spawn('ffmpeg', [
          '-re',
          '-i',
          tempVideoPath,
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-tune',
          'zerolatency',
          // חשוב: הוספת הגדרות ה-RTP שיתאימו ל-Producer
          '-f',
          'rtp',
          `rtp://127.0.0.1:${videoRtpPort}?pkt_size=1316&ssrc=11111&payload_type=101`,
          '-f',
          'hls',
          '-hls_time',
          '4',
          '-hls_list_size',
          '0',
          path.join(streamPath, 'index.m3u8'),
        ]);

        activeStreams.set(streamId, {
          ffmpeg,
          router,
          transport,
          producer: videoProducer, // שומרים גם את ה-producer בזיכרון
          startTime: Date.now(),
          streamPath,
        });

        // ניהול לוגים של FFmpeg
        ffmpeg.stderr.on('data', (data) => {
          const msg = data.toString();
          if (msg.includes('time=')) {
            const time = msg.match(/time=(\S+)/)?.[1] || '00:00:00';
            process.stdout.write(`\r🎬 Streaming Progress: ${time}`);
          }
        });

        ffmpeg.on('close', (code) => {
          console.log(`\n🏁 FFmpeg finished with code ${code}`);
          // מחיקת הקובץ הזמני בסיום
          if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
          console.log(`✅ Stream ${streamId} processing finished.`);
        });

        await this.notifyBackend(streamId, 'LIVE');
        console.log(`\n🚀 Stream is now LIVE via WebRTC and HLS!`);
      } catch (error) {
        console.error(`❌ WebRTC Initialization failed:`, error.message);
      }
    });

    writeStream.on('error', (err) => console.error(`❌ Write error:`, err));
    inputPipe.on('error', (err) => {
      console.error(`❌ Input error:`, err);
      writeStream.destroy();
    });
  },

  stopStream(streamId) {
    const stream = activeStreams.get(streamId);
    if (stream) {
      if (stream.ffmpeg) stream.ffmpeg.kill('SIGTERM');
      activeStreams.delete(streamId);
      console.log(`🛑 Stream ${streamId} stopped.`);
    }
  },
};
