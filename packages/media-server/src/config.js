// src/config.js
import os from 'os';

export const config = {
  mediasoup: {
    // מספר ה-Workers כמספר הליבות
    numWorkers: Object.keys(os.cpus()).length,

    worker: {
      rtcMinPort: process.env.RTC_MIN_PORT
        ? parseInt(process.env.RTC_MIN_PORT)
        : 10000,
      rtcMaxPort: process.env.RTC_MAX_PORT
        ? parseInt(process.env.RTC_MAX_PORT)
        : 10010, // צמצמנו ל-10 בשביל דוקר
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    },

    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        // הוסיפי את החלק הזה עבור FFmpeg
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f', // פרופיל שמתאים לרוב הדפדפנים ו-FFmpeg
            'level-asymmetry-allowed': 1,
          },
        },
      ],
    },

    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1', // שימי לב: בפרודקשן זה ה-IP הציבורי
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
    },
  },
};
