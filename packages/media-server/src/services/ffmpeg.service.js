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
    const ip = process.env.ANNOUNCED_IP || '127.0.0.1';

    let sdp = `v=0
o=- 0 0 IN IP4 ${ip}
s=Mediasoup
c=IN IP4 ${ip}
t=0 0
m=video ${videoPort} RTP/AVP 101
a=rtpmap:101 VP8/90000
`;

    if (audioPort) {
      sdp += `m=audio ${audioPort} RTP/AVP 111
a=rtpmap:111 opus/48000/2
`;
    }

    return sdp;
  }

  async start(sdpString) {
    const sdpPath = path.join(this.outputDir, 'input.sdp');
    fs.writeFileSync(sdpPath, sdpString);

    // המתנה של 1.5 שניות כדי לוודא שה-Producer ב-Mediasoup התחיל לשלוח דאטה
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const args = [
      '-loglevel',
      'info',
      '-protocol_whitelist',
      'rtp,udp,file,crypto,data,pipe',
      // 1. אופטימיזציה לקלט - מניעת הדיליי שגורם ל-Drop
      '-fflags',
      '+genpts+discardcorrupt+nobuffer',
      '-flags',
      'low_delay',
      '-f',
      'sdp',
      '-i',
      sdpPath,
      '-map',
      '0:v:0',
      // 2. אופטימיזציה לקידוד - מהירות מקסימלית על חשבון איכות
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast', // הכי מהיר שיש
      '-tune',
      'zerolatency', // מותאם לשידור חי
      '-g',
      '30', // יצירת Keyframe כל 30 פריימים (עוזר ליציבות)
      // 3. הגדרות HLS
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
