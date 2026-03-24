import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class FFmpegService {
  constructor(gameId) {
    this.gameId = gameId;
    this.process = null;
    // ודאי שהנתיב מוחלט וקיים
    this.outputDir = path.resolve(process.cwd(), 'public', 'streams', gameId);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created directory: ${this.outputDir}`);
    }
  }

  generateSDP(videoTransport, audioTransport) {
    const videoPort = videoTransport.tuple.localPort;
    const audioPort = audioTransport ? audioTransport.tuple.localPort : null;
    const ip = '127.0.0.1'; // בתוך הדוקר עובדים עם localhost פנימי

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

    return sdp;
  }

  async start(sdpString) {
    const sdpPath = path.join(this.outputDir, 'input.sdp');
    fs.writeFileSync(sdpPath, sdpString);

    // המתנה של 1.5 שניות כדי לוודא שה-Producer ב-Mediasoup התחיל לשלוח דאטה
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // packages/media-server/src/services/ffmpeg.service.js

    const args = [
      '-loglevel',
      'info',
      '-protocol_whitelist',
      'rtp,udp,file,crypto,data,pipe',
      '-fflags',
      '+genpts+discardcorrupt+nobuffer',
      '-flags',
      'low_delay',
      '-f',
      'sdp',
      '-i',
      sdpPath,
      // הוספת מפות (Mapping): מפה 0:0 לוידאו, מפה 0:1 לאודיו
      '-map',
      '0:v:0',
      '-map',
      '0:a:0',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      // קידוד אודיו ל-AAC (סטנדרט של HLS)
      '-c:a',
      'aac',
      '-ar',
      '44100', // Sample rate
      '-ac',
      '2', // Stereo
      '-f',
      'hls',
      '-hls_time',
      '2',
      '-hls_list_size',
      '3',
      '-hls_flags',
      'delete_segments',
      path.join(this.outputDir, 'index.m3u8'),
    ];

    console.log(`🚀 [FFMPEG] Starting with args for ${this.gameId}`);
    this.process = spawn('ffmpeg', args);

    this.process.stderr.on('data', (data) => {
      const message = data.toString();

      if (message.includes('frame=')) {
        const progress = message
          .split('\n')
          .find((line) => line.includes('frame='));
        if (progress) {
          console.log(`✅ [FFMPEG PROGRESS]: ${progress.trim()}`);
        }
      }

      if (
        message.toLowerCase().includes('error') ||
        message.includes('Invalid argument')
      ) {
        console.error(`❌ [FFMPEG ERROR]: ${message.trim()}`);
      }
    });

    this.process.on('close', (code) => {
      console.log(`[FFMPEG PROCESS] Exited with code ${code}`);
    });
  }
}
