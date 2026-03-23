import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createPlainTransportForFFmpeg } from './mediasoup.service.js';

const activeStreams = new Map();

const ensureDirectory = (streamId) => {
  const streamPath = path.join(
    '/usr/src/app/packages/media-server/public/streams',
    streamId
  );
  if (!fs.existsSync(streamPath)) {
    fs.mkdirSync(streamPath, { recursive: true });
    fs.chmodSync(streamPath, 0o777);
  }
  return streamPath;
};
const createSDPFile = (streamPath, port) => {
  const sdpContent = [
    'v=0',
    'o=- 0 0 IN IP4 127.0.0.1',
    's=Mediasoup',
    'c=IN IP4 127.0.0.1',
    't=0 0',
    `m=video ${port} RTP/AVP 101`,
    'a=rtpmap:101 VP8/90000',
    'a=rtcp-mux',
    '',
  ].join('\r\n');
  const sdpPath = path.join(streamPath, 'input.sdp');
  fs.writeFileSync(sdpPath, sdpContent);
  return sdpPath;
};

const spawnFFmpeg = (sdpPath, streamPath, streamId) => {
  const args = [
    '-loglevel',
    'info',
    '-protocol_whitelist',
    'rtp,udp,file,crypto,data,pipe',
    '-f',
    'sdp',
    '-i',
    sdpPath,
    '-map',
    '0:v:0',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-tune',
    'zerolatency',
    '-f',
    'hls',
    '-hls_time',
    '2',
    '-hls_list_size',
    '3',
    '-hls_flags',
    'delete_segments',
    path.join(streamPath, 'index.m3u8'),
  ];

  const ffmpeg = spawn('ffmpeg', args, {
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  ffmpeg.on('error', (err) =>
    console.error(`❌ FFmpeg Error [${streamId}]:`, err.message)
  );
  ffmpeg.on('close', (code) => {
    console.log(`🎬 FFmpeg process closed (code ${code}) for ${streamId}`);
    activeStreams.delete(streamId);
  });

  return ffmpeg;
};

export const StreamService = {
  async startRecording(streamId, router, producer) {
    if (activeStreams.has(streamId)) return;
    console.log(`🚀 Starting HLS Pipeline for stream: ${streamId}`);

    const streamPath = ensureDirectory(streamId);

    try {
      // 1. הגדרת Transport ופורט
      const transport = await createPlainTransportForFFmpeg(router);
      const ffmpegInputPort = 11000 + Math.floor(Math.random() * 500);

      await transport.connect({ ip: '127.0.0.1', port: ffmpegInputPort });

      // 2. יצירת הצרכן (Consumer) לוידאו
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities,
        paused: false,
      });

      // 3. יצירת קובץ SDP
      const sdpPath = createSDPFile(streamPath, ffmpegInputPort);

      // 4. הפעלת FFmpeg לאחר השהייה קלה לסנכרון
      setTimeout(async () => {
        try {
          const ffmpeg = spawnFFmpeg(sdpPath, streamPath, streamId);
          activeStreams.set(streamId, { ffmpeg, consumer, transport });

          console.log(`🎥 FFmpeg is live. Requesting initial Keyframe...`);
          await consumer
            .requestKeyFrame()
            .catch((e) =>
              console.warn('⚠️ Initial Keyframe request failed:', e.message)
            );
        } catch (error) {
          console.error('❌ Failed to launch FFmpeg pipeline:', error.message);
        }
      }, 1000);
    } catch (err) {
      console.error('❌ StreamService error:', err.message);
    }
  },
};
