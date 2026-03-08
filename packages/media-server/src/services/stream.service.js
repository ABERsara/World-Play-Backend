// packages/media-server/src/services/stream.service.js

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createPlainTransportForFFmpeg } from './mediasoup.service.js';
// const TEMP_DIR = '/usr/src/app/packages/media-server/media_files';
const activeStreams = new Map();

export const StreamService = {
  //   async startRecording(streamId, producer, router) {
  //     if (activeStreams.has(streamId)) return;

  //     // הגדרת נתיב התיקייה הסטטית לפי האפיון (MVP)
  //     const streamPath = path.join(process.cwd(), 'public', 'streams', streamId);
  //     if (!fs.existsSync(streamPath)) {
  //         fs.mkdirSync(streamPath, { recursive: true });
  //     }

  //     try {
  //       // 1. יצירת הצינור (PlainTransport) עבור Stream B
  //       const transport = await createPlainTransportForFFmpeg(router);

  //       // FFmpeg יאזין בפורט מקומי בתוך הקונטיינר
  //       const videoPort = 5004;
  //       await transport.connect({ ip: '127.0.0.1', port: videoPort });

  //       // 2. יצירת Consumer שמושך את הוידאו מה-Producer ל-FFmpeg
  //       const consumer = await transport.consume({
  //         producerId: producer.id,
  //         rtpCapabilities: router.rtpCapabilities,
  //         paused: false,
  //       });

  //       // 3. יצירת קובץ ה-SDP (המפה של הסטרים)
  //       const sdpContent = `v=0
  // o=- 0 0 IN IP4 127.0.0.1
  // s=Mediasoup Stream B
  // c=IN IP4 127.0.0.1
  // t=0 0
  // m=video ${videoPort} RTP/AVP 101
  // a=rtpmap:101 H264/90000
  // `;
  //       const sdpPath = path.join(streamPath, 'input.sdp');
  //       fs.writeFileSync(sdpPath, sdpContent);

  //       // 4. הפעלת FFmpeg
  //       const ffmpeg = spawn('ffmpeg', [
  //         '-protocol_whitelist', 'pipe,udp,rtp,file',
  //         '-i', sdpPath,
  //         // --- פרמטרים לקידוד איכותי ומהיר ---
  //         '-vcodec', 'libx264',
  //         '-crf', '10',         // איכות גבוהה מאוד
  //         '-preset', 'faster',  // מהירות קידוד גבוהה
  //         '-tune', 'film',      // אופטימיזציה לסרטים/וידאו

  //         // --- יצירת הפוסטר (תמונה מייצגת) ---
  //         '-ss', '00:00:00.500', // תפיסה ב-0.5 שניות הראשונות
  //         '-vframes', '1',       // פריים אחד בלבד
  //         path.join(streamPath, 'poster.png'), // שמירה כפוסטר

  //         // --- הגדרות HLS לטובת Time-shifting ---
  //         '-f', 'hls',
  //         '-hls_time', '2',      // מקטעים של 2 שניות ללייב מהיר
  // '-hls_list_size', '20', //שמירת 20 שניות אחרונות כדי לאפשר זרימה חלקה לכל צופה שיצטרף בהמשך המשחק
  //         '-hls_flags', 'delete_segments+append_list',
  //         path.join(streamPath, 'index.m3u8')
  //       ]);

  //       activeStreams.set(streamId, { ffmpeg, consumer, transport });

  //       ffmpeg.stderr.on('data', (data) => {
  //         // הדפסת לוגים של FFmpeg לצורך ניטור ובדיקה
  //         console.log(`[FFMPEG ${streamId}]: ${data}`);
  //       });

  //       console.log(`✅ Stream B (HLS + Poster) initialized for ${streamId}`);
  //     } catch (err) {
  //       console.error(`❌ Failed to start Stream B for ${streamId}:`, err);
  //     }
  //   },
  async startRecording(streamId, router, producer) {
    if (activeStreams.has(streamId)) return;

    const streamPath = this._ensureDirectory(streamId);

    try {
      // 1. הקמת הצינור (Transport)
      const transport = await createPlainTransportForFFmpeg(router);

      // 2. חיבור הצינור לפורט המקומי של FFmpeg
      const videoPort = 5004;
      const rtcpPort = 5005; // פורט נוסף לבקרה

      // חיבור הטרנספורט עם שני הפורטים
      await transport.connect({
        ip: '127.0.0.1',
        port: videoPort,
        rtcpPort: rtcpPort,
      });

      // 3. יצירת הצרכן (Consumer) שמושך וידאו לצינור
      const consumer = await this._createConsumer(transport, producer, router);

      // 4. יצירת קובץ ה-SDP (המפה ל-FFmpeg)
      // הוספנו a=rtcp:5005 כדי ש-FFmpeg ידע איפה ה-RTCP נמצא
      const sdpPath = this._createSDPFile(streamPath, videoPort, rtcpPort);
      // 5. הפעלת מנוע ה-FFmpeg
      const ffmpeg = this._spawnFFmpeg(sdpPath, streamPath, streamId);

      // שמירה בזיכרון
      activeStreams.set(streamId, { ffmpeg, consumer, transport });

      console.log(`✅ [STREAM B] Pipeline initialized for ${streamId}`);
    } catch (err) {
      console.error(`❌ [STREAM B] Failed for ${streamId}:`, err);
      throw err;
    }
  },

  // --- פונקציות עזר פרטיות (הפירוק) ---

  _ensureDirectory(streamId) {
    const streamPath = path.join(process.cwd(), 'public', 'streams', streamId);
    if (!fs.existsSync(streamPath)) {
      fs.mkdirSync(streamPath, { recursive: true });
    }
    return streamPath;
  },

  async _createConsumer(transport, producer, router) {
    return await transport.consume({
      producerId: producer.id,
      rtpCapabilities: router.rtpCapabilities,
      paused: false,
    });
  },

  _createSDPFile(streamPath, port, rtcpPort) {
    const sdpContent = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Mediasoup Stream B
c=IN IP4 127.0.0.1
t=0 0
m=video ${port} RTP/AVP 101
a=rtpmap:101 H264/90000
a=rtcp:${rtcpPort}
`;
    const sdpPath = path.join(streamPath, 'input.sdp');
    fs.writeFileSync(sdpPath, sdpContent);
    return sdpPath;
  },

  _spawnFFmpeg(sdpPath, streamPath, streamId) {
    const ffmpeg = spawn('ffmpeg', [
      '-protocol_whitelist',
      'pipe,udp,rtp,file',
      '-i',
      sdpPath,
      '-vcodec',
      'libx264',
      '-crf',
      '20',
      '-preset',
      'veryfast',
      '-tune',
      'zerolatency', // חשוב ללייב!

      // יצירת פוסטר
      '-ss',
      '00:00:00.500',
      '-vframes',
      '1',
      path.join(streamPath, 'poster.png'),

      // הגדרות HLS
      '-f',
      'hls',
      '-hls_time',
      '2',
      '-hls_list_size',
      '20',
      '-hls_flags',
      'delete_segments+append_list',
      path.join(streamPath, 'index.m3u8'),
    ]);
    ffmpeg.stderr.on('data', (data) => {
      // זה ידפיס ה-כ-ל מה-FFmpeg, גם אם זו לא שגיאה
      console.log(`[FFMPEG DEBUG ${streamId}]: ${data.toString()}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`[FFMPEG PROCESS] Process exited with code ${code}`);
    });

    return ffmpeg;
  },

  stopStream(streamId) {
    const stream = activeStreams.get(streamId);
    if (stream) {
      if (stream.ffmpeg) stream.ffmpeg.kill('SIGTERM');
      stream.consumer.close();
      stream.transport.close();
      activeStreams.delete(streamId);
      console.log(`🛑 Stream B stopped for ${streamId}`);
    }
  },
};
