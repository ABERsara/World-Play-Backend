// packages/media-server/src/services/stream.service.js

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createPlainTransportForFFmpeg } from './mediasoup.service.js';

const TEMP_DIR = '/usr/src/app/packages/media-server/media_files';
const activeStreams = new Map();

export const StreamService = {
  // פונקציה חדשה: התחלת הקלטה משידור WebRTC קיים
  async startRecording(streamId, producer, router) {
    if (activeStreams.has(streamId)) return;

    const streamPath = path.join(TEMP_DIR, streamId);
    if (!fs.existsSync(streamPath))
      fs.mkdirSync(streamPath, { recursive: true });

    console.log(`🎬 Setting up FFmpeg recording for producer: ${producer.id}`);

    try {
      // 1. יצירת טרנספורט שמוציא RTP מה-Mediasoup
      const transport = await createPlainTransportForFFmpeg(router);

      // הגדרת פורטים מקומיים עבור FFmpeg
      const videoPort = 5004;
      const rtcpPort = 5005;

      // חיבור הטרנספורט לפורטים של FFmpeg
      await transport.connect({ ip: '127.0.0.1', port: videoPort, rtcpPort });

      // 2. יצירת Consumer - הוא זה ש"מושך" את הוידאו מהמנחה לטרנספורט
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities,
        paused: false,
      });

      // 3. יצירת קובץ SDP זמני ש-FFmpeg צריך כדי להבין את הזרם
      const sdpContent = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Mediasoup Stream
c=IN IP4 127.0.0.1
t=0 0
m=video ${videoPort} RTP/AVP 101
a=rtpmap:101 H264/90000
a=fmtp:101 packetization-mode=1;profile-level-id=42e01f;level-asymmetry-allowed=1
`;
      const sdpPath = path.join(streamPath, 'input.sdp');
      fs.writeFileSync(sdpPath, sdpContent);

      // 4. הפעלת FFmpeg במצב הקלטה (מאזין ל-SDP)
      const ffmpeg = spawn('ffmpeg', [
        '-protocol_whitelist',
        'file,rtp,udp',
        '-i',
        sdpPath,
        '-c:v',
        'copy', // העתקה ישירה ללא קידוד מחדש (0% דיליי, 0% CPU)
        '-f',
        'hls',
        '-hls_time',
        '2',
        '-hls_list_size',
        '0', // שומר את כל ההיסטוריה לצורך "חזרה אחורה"
        '-hls_flags',
        'delete_segments+append_list',
        path.join(streamPath, 'index.m3u8'),
      ]);

      activeStreams.set(streamId, { ffmpeg, consumer, transport, streamPath });

      ffmpeg.stderr.on('data', (data) => {
        if (data.toString().includes('frame=')) {
          process.stdout.write(`\r⏺️ Recording in progress: ${streamId}`);
        }
      });

      console.log(`✅ FFmpeg is now recording WebRTC to HLS`);
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
    }
  },

  stopStream(streamId) {
    const stream = activeStreams.get(streamId);
    if (stream) {
      if (stream.ffmpeg) stream.ffmpeg.kill('SIGTERM');
      activeStreams.delete(streamId);
      console.log(`🛑 Recording stopped for ${streamId}`);
    }
  },
};
