import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class FFmpegService {
  constructor(gameId) {
    this.gameId = gameId;
    this.process = null;
    this.outputDir = path.join(process.cwd(), 'public', 'streams', gameId);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  generateSDP(videoTransport, audioTransport, videoPayloadType, audioPayloadType) {
    return `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Mediasoup Stream B
c=IN IP4 127.0.0.1
t=0 0
m=video ${videoTransport.tuple.localPort} RTP/AVP ${videoPayloadType}
a=rtpmap:${videoPayloadType} H264/90000
a=fmtp:${videoPayloadType} packetization-mode=1;profile-level-id=42e01f;level-asymmetry-allowed=1
m=audio ${audioTransport.tuple.localPort} RTP/AVP ${audioPayloadType}
a=rtpmap:${audioPayloadType} opus/48000/2
`;
  }

 async start(sdpString) { // הוספתי async כי יש לך await בפנים
    console.log("!!!!! I AM RUNNING THE NEW CODE VERSION !!!!!");
    const sdpPath = path.join(this.outputDir, 'input.sdp');
    fs.writeFileSync(sdpPath, sdpString);

    // המתנה קלה כדי שה-Packets יתחילו לזרום
    await new Promise(resolve => setTimeout(resolve, 1000));

    const args = [
        '-loglevel', 'info',
        '-protocol_whitelist', 'pipe,udp,rtp,file',
        '-analyzeduration', '10000000', // הגדלנו ל-10 שניות ניתוח
        '-probesize', '10000000',
        '-f', 'sdp',
        '-i', sdpPath,

        // המיפוי הגמיש - לא קורס אם חסר סטרים
        '-map', '0:v:0?', 
        '-map', '0:a:0?',

        // הגדרות וידאו (קידוד מחדש מבטיח תאימות ל-HLS)
        '-vcodec', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'ultrafast', // הכי מהיר שיש
        '-tune', 'zerolatency',
        '-g', '50',             // Keyframe כל 50 פריימים (חשוב ל-HLS)
        
        // הגדרות אודיו
        '-acodec', 'aac',
        '-ar', '44100',
        '-ac', '2',

        // הגדרות HLS
        '-f', 'hls',
        '-hls_time', '2',       // מקטעים של 2 שניות לדיליי נמוך
        '-hls_list_size', '6',  // שומר רק את ה-6 האחרונים
        '-hls_flags', 'delete_segments+append_list+independent_segments',
        '-hls_segment_type', 'mpegts',
        path.join(this.outputDir, 'index.m3u8'),
    ];

    console.log(`🚀 [FFMPEG] Starting with args for ${this.gameId}`);
    this.process = spawn('ffmpeg', args);

    this.process.stderr.on('data', (data) => {
        const message = data.toString();
        // נחפש אינדיקציה שהסטרים התחיל לעבוד
        if (message.includes('frame=')) {
            console.log(`✅ [FFMPEG PROGRESS]: ${message.split('\n')[0].trim()}`);
        } else if (message.includes('Error')) {
            console.error(`❌ [FFMPEG ERROR]: ${message}`);
        }
    });

    this.process.on('close', (code) => {
        console.log(`[FFMPEG PROCESS] Exited with code ${code}`);
    });
}
}