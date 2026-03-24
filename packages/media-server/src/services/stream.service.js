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

const createUnifiedSDP = (streamPath, videoPort, audioPort) => {
  const ip = '127.0.0.1';
  const sdpLines = [
    'v=0',
    `o=- 0 0 IN IP4 ${ip}`,
    's=Mediasoup',
    `c=IN IP4 ${ip}`,
    't=0 0',
    // וידאו
    `m=video ${videoPort} RTP/AVP 101`,
    'a=rtpmap:101 VP8/90000',
    'a=rtcp-mux',
  ];

  // הוספת אודיו ל-SDP רק אם הוא קיים
  if (audioPort) {
    sdpLines.push(
      `m=audio ${audioPort} RTP/AVP 111`,
      'a=rtpmap:111 opus/48000/2',
      'a=rtcp-mux'
    );
  }

  const sdpContent = sdpLines.join('\r\n') + '\r\n';
  const sdpPath = path.join(streamPath, 'input.sdp');
  fs.writeFileSync(sdpPath, sdpContent);
  return sdpPath;
};

const spawnFFmpeg = (sdpPath, streamPath, streamId, hasAudio) => {
  const args = [
    '-loglevel',
    'info',
    '-protocol_whitelist',
    'rtp,udp,file,crypto,data,pipe',
    // אופטימיזציה למניעת Drops ודיליי
    '-fflags',
    '+genpts+discardcorrupt+nobuffer',
    '-flags',
    'low_delay',
    '-f',
    'sdp',
    '-i',
    sdpPath,
    // מיפוי ערוצים
    '-map',
    '0:v:0',
  ];

  if (hasAudio) {
    args.push('-map', '0:a:0');
  }

  args.push(
    // הגדרות וידאו (מהירות מקסימלית)
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-tune',
    'zerolatency',
    '-pix_fmt',
    'yuv420p',
    // הגדרות אודיו (AAC נתמך הכי טוב ב-HLS)
    '-c:a',
    'aac',
    '-ar',
    '44100',
    '-ac',
    '2',
    // הגדרות HLS
    '-f',
    'hls',
    '-hls_time',
    '2',
    '-hls_list_size',
    '3',
    '-hls_flags',
    'delete_segments',
    path.join(streamPath, 'index.m3u8')
  );

  const ffmpeg = spawn('ffmpeg', args, {
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  ffmpeg.on('error', (err) =>
    console.error(`❌ FFmpeg Error [${streamId}]:`, err.message)
  );
  ffmpeg.on('close', (code) => {
    console.log(`🎬 FFmpeg closed (code ${code}) for ${streamId}`);
    activeStreams.delete(streamId);
  });

  return ffmpeg;
};

// --- הפונקציה הראשית ---

export const StreamService = {
  async startRecording(streamId, router, producer) {
    const kind = producer.kind; // 'video' או 'audio'

    // יצירת אובייקט מצב לסטרים אם הוא לא קיים
    if (!activeStreams.has(streamId)) {
      activeStreams.set(streamId, {
        videoConsumer: null,
        audioConsumer: null,
        ffmpeg: null,
        streamPath: ensureDirectory(streamId),
      });
    }

    const state = activeStreams.get(streamId);

    try {
      // 1. יצירת Transport וחיבורו
      const transport = await createPlainTransportForFFmpeg(router);
      const rtpPort = 11000 + Math.floor(Math.random() * 1000);
      await transport.connect({ ip: '127.0.0.1', port: rtpPort });

      // 2. יצירת Consumer
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities,
        paused: false,
      });

      // שמירת ה-Consumer במצב
      if (kind === 'video') state.videoConsumer = { consumer, rtpPort };
      else state.audioConsumer = { consumer, rtpPort };

      console.log(`📡 [${kind.toUpperCase()}] linked to port ${rtpPort}`);

      // 3. החלטה האם להפעיל את FFmpeg
      // אנחנו מחכים שיהיה וידאו. אם יש גם אודיו - מעולה, נחבר את שניהם.
      if (kind === 'video') {
        // אם כבר רץ FFmpeg, נסגור אותו (למקרה של Refresh)
        if (state.ffmpeg) state.ffmpeg.kill();

        setTimeout(async () => {
          const sdpPath = createUnifiedSDP(
            state.streamPath,
            state.videoConsumer.rtpPort,
            state.audioConsumer?.rtpPort
          );

          state.ffmpeg = spawnFFmpeg(
            sdpPath,
            state.streamPath,
            streamId,
            !!state.audioConsumer
          );

          console.log(
            `🎥 FFmpeg started for stream ${streamId} (Audio: ${!!state.audioConsumer})`
          );

          await state.videoConsumer.consumer.requestKeyFrame().catch(() => {});
        }, 1000);
      }
    } catch (err) {
      console.error(`❌ StreamService error [${kind}]:`, err.message);
    }
  },
};
