/**
 * stream.service.js (media-server)
 *
 * מנוע ה-HLS — מנהל תהליכי FFmpeg לכל שידור חי.
 * מקבל RTP מ-mediasoup, כותב קבצי HLS לדיסק, ומנקה בסיום.
 *
 * זרימת עבודה:
 *   1. startRecording(video) → יוצר state + מחכה 3 שניות לאודיו
 *   2. startRecording(audio) → מבטל טיימר ומפעיל FFmpeg מיד
 *   3. stopRecording       → הורג FFmpeg, סוגר consumers, מוחק תיקייה
 *
 * מתקשר עם: mediasoup (PlainTransport, Consumer), FFmpeg (child_process), fs (HLS segments)
 * תלוי ב:   mediasoup.service.js
 * משמש את:  socket handlers בשרת המדיה
 *
 * TODO: port assignment אקראי (Math.random) — עלול לגרום קולוזיות, כדאי מנגנון pool
 */
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
  let sdp = `v=0
o=- 0 0 IN IP4 ${ip}
s=Mediasoup
c=IN IP4 ${ip}
t=0 0
m=video ${videoPort} RTP/AVP 101
a=rtpmap:101 VP8/90000
a=rtcp-mux
`;

  if (audioPort) {
    sdp += `m=audio ${audioPort} RTP/AVP 111
a=rtpmap:111 opus/48000/2
a=rtcp-mux
`;
  }

  const sdpPath = path.join(streamPath, 'input.sdp');
  fs.writeFileSync(sdpPath, sdp);
  return sdpPath;
};

const spawnFFmpeg = (sdpPath, streamPath, streamId, hasAudio) => {
  const args = [
    '-loglevel',
    'info',
    '-protocol_whitelist',
    'rtp,udp,file,crypto,data,pipe',
    '-fflags',
    '+genpts+discardcorrupt+nobuffer',
    '-probesize',
    '32', // הקטנה משמעותית כדי להתחיל מיד
    '-analyzeduration',
    '0', // ביטול ניתוח דאטה מקדים
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

    // הגדרות Keyframes - קריטי למניעת תקיעות ו"Keyframe missing"
    '-g',
    '15', // Keyframe כל 15 פריימים (סופר מהיר)
    '-keyint_min',
    '15',
    '-sc_threshold',
    '0', // מנטרל זיהוי סצנות כדי להכריח Keyframes קבועים

    // הגדרות אודיו (AAC נתמך הכי טוב ב-HLS)
    '-c:a',
    'aac',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-b:a',
    '128k',

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

  console.log(
    `🚀 [FFMPEG] Spawning process for stream: ${streamId} (Audio: ${hasAudio})`
  );

  const ffmpeg = spawn('ffmpeg', args, {
    stdio: ['pipe', 'inherit', 'inherit'], // inherit יזרוק את הלוגים ישירות לטרמינל של הדוקר
  });

  ffmpeg.on('error', (err) => {
    console.error(`❌ FFmpeg Error [${streamId}]:`, err.message);
  });

  ffmpeg.on('close', (code) => {
    // קוד 255 או 0 בדרך כלל אומר סגירה יזומה שלנו (SIGKILL/SIGINT)
    console.log(`🎬 FFmpeg process for ${streamId} closed with code ${code}`);

    // ניקוי המפה במידה והתהליך נסגר מעצמו
    if (activeStreams.has(streamId)) {
      activeStreams.delete(streamId);
    }
  });

  return ffmpeg;
};

// --- הפונקציה הראשית ---
const ffmpegTimers = new Map();

export const StreamService = {
  async startRecording(streamId, router, producer) {
    const kind = producer.kind;

    if (!activeStreams.has(streamId)) {
      activeStreams.set(streamId, {
        videoConsumer: null,
        audioConsumer: null,
        ffmpeg: null,
        streamPath: ensureDirectory(streamId),
        videoPort: 11000 + Math.floor(Math.random() * 500),
        audioPort: 12000 + Math.floor(Math.random() * 500),
      });
    }

    const state = activeStreams.get(streamId);

    try {
      const transport = await createPlainTransportForFFmpeg(router);
      const targetPort = kind === 'video' ? state.videoPort : state.audioPort;
      await transport.connect({ ip: '127.0.0.1', port: targetPort });

      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities,
        paused: false,
      });

      if (kind === 'video') state.videoConsumer = { consumer, transport };
      else state.audioConsumer = { consumer, transport };

      console.log(
        `📡 [${kind.toUpperCase()}] Consumer ready on port ${targetPort}`
      );

      // --- לוגיקת סנכרון משופרת ---

      // פונקציה פנימית שמפעילה את FFmpeg
      const launchFFmpeg = () => {
        const currentState = activeStreams.get(streamId);
        if (!currentState || currentState.ffmpeg || !currentState.videoConsumer)
          return;

        // בודקים אם יש אודיו - אם לא, והטיימר לא נגמר, נחכה עוד קצת
        const hasAudio = !!currentState.audioConsumer;

        const sdpPath = createUnifiedSDP(
          currentState.streamPath,
          currentState.videoPort,
          hasAudio ? currentState.audioPort : null
        );

        currentState.ffmpeg = spawnFFmpeg(
          sdpPath,
          currentState.streamPath,
          streamId,
          hasAudio
        );

        console.log(`🎥 FFmpeg Launch! Audio Status: ${hasAudio}`);

        // נותנים ל-FFmpeg שניה להתאפס ואז מבקשים Keyframe
        setTimeout(() => {
          currentState.videoConsumer.consumer.requestKeyFrame().catch(() => {});
        }, 1000);
      };

      // אם זה אודיו - הוא כנראה הגיע אחרון, אז ננסה להפעיל מיד
      if (kind === 'audio') {
        if (ffmpegTimers.has(streamId)) {
          clearTimeout(ffmpegTimers.get(streamId));
          ffmpegTimers.delete(streamId);
        }
        launchFFmpeg();
      }
      // אם זה וידאו - נחכה 3 שניות לאודיו שיגיע
      else if (kind === 'video') {
        const timer = setTimeout(() => {
          launchFFmpeg(); // מפעיל אחרי 3 שניות גם אם אין אודיו
          ffmpegTimers.delete(streamId);
        }, 3000);
        ffmpegTimers.set(streamId, timer);
      }
    } catch (err) {
      console.error(`❌ StreamService error:`, err.message);
    }
  },
  async stopRecording(streamId) {
    const state = activeStreams.get(streamId);
    if (!state) return;

    console.log(`🛑 Stopping stream and DELETING folder: ${streamId}`);

    // 1. הריגת ה-FFmpeg
    if (state.ffmpeg) {
      state.ffmpeg.kill('SIGKILL');
    }

    // 2. סגירת Consumers
    if (state.videoConsumer) state.videoConsumer.consumer.close();
    if (state.audioConsumer) state.audioConsumer.consumer.close();

    // 3. מחיקת התיקייה הפיזית מהדיסק
    try {
      if (fs.existsSync(state.streamPath)) {
        // מוחק את התיקייה וכל מה שבתוכה (סגמנטים, m3u8, sdp)
        fs.rmSync(state.streamPath, { recursive: true, force: true });
        console.log(`🗑️ Folder deleted: ${state.streamPath}`);
      }
    } catch (err) {
      console.error(`❌ Failed to delete folder: ${err.message}`);
    }

    activeStreams.delete(streamId);
  },
};
