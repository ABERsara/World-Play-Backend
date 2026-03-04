import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class FFmpegService {
  constructor(gameId) {
    this.gameId = gameId;
    this.process = null;
    // נתיב לתיקייה הסטטית ל-FFmpeg לשמור את הפלט (HLS + Poster)
    this.outputDir = path.join(process.cwd(), 'public', 'streams', gameId);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // יצירת קובץ SDP - ה"מפה" עבור FFmpeg
  generateSDP(
    videoTransport,
    audioTransport,
    videoPayloadType,
    audioPayloadType
  ) {
    return `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Mediasoup Stream B
c=IN IP4 127.0.0.1
t=0 0
m=video ${videoTransport.tuple.localPort} RTP/AVP ${videoPayloadType}
a=rtpmap:${videoPayloadType} H264/90000
m=audio ${audioTransport.tuple.localPort} RTP/AVP ${audioPayloadType}
a=rtpmap:${audioPayloadType} opus/48000/2
`;
  }

  start(sdpString) {
    const sdpPath = path.join(this.outputDir, 'input.sdp');
    fs.writeFileSync(sdpPath, sdpString);

    const args = [
      '-protocol_whitelist',
      'pipe,udp,rtp,file',
      '-i',
      sdpPath,
      // פרמטרי הר"צ:
      '-vcodec',
      'libx264',
      '-crf',
      '10',
      '-preset',
      'faster',
      '-tune',
      'film',
      // יצירת ה-Poster (תמונה מייצגת) [cite: 81]
      '-ss',
      '00:00:00.500',
      '-vframes',
      '1',
      path.join(this.outputDir, 'poster.png'),
      // הגדרות HLS לצפייה סטטית
      '-f',
      'hls',
      '-hls_time',
      '2', // מקטעים של 2 שניות ללייב מהיר
      '-hls_list_size',
      '0', // לשמור את כל ההיסטוריה לטובת Time-shifting
      '-hls_flags',
      'delete_segments+append_list',
      path.join(this.outputDir, 'index.m3u8'),
    ];

    this.process = spawn('ffmpeg', args);

    this.process.stderr.on('data', (data) => {
      console.log(`[FFmpeg ${this.gameId}]: ${data}`);
    });
  }

  stop() {
    if (this.process) this.process.kill();
  }
}
