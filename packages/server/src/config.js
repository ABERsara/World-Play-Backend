// src/config.js
import os from 'os';

export const config = {
  mediasoup: {
    // מספר ה-Workers כמספר הליבות
    numWorkers: Object.keys(os.cpus()).length,
    
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    },
    
    router: {
      mediaCodecs: [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },
  {
    kind: 'video',
    mimeType: 'video/VP8', // VP8 נתמך כמעט בכל דפדפן
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000
    }
  }
]
    },
    
    webRtcTransport: {
      listenIps: [
        {
          // שינוי כאן: '0.0.0.0' אומר לשרת להאזין בכל כרטיסי הרשת הקיימים במחשב
          ip: '0.0.0.0', 
          
          // הכתובת שהדפדפן ינסה לפנות אליה. בבדיקה מקומית זה תמיד 127.0.0.1
          announcedIp: '127.0.0.1' 
        }
      ],
      initialAvailableOutgoingBitrate: 1000000,
    }
  }
};