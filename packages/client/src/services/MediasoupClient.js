import { Device } from 'mediasoup-client';
import * as Base64 from 'base-64';

// 1. הגדרת Polyfills קריטיים - פותר את שגיאת ה-btoa/atob
if (typeof global.btoa === 'undefined') {
  global.btoa = (str) => Base64.encode(str);
}
if (typeof global.atob === 'undefined') {
  global.atob = (str) => Base64.decode(str);
}

// 2. ייבוא בטוח של WebRTC - מונע קריסה ב-Expo Go
try {
  const webrtc = require('react-native-webrtc');
  if (webrtc && webrtc.registerGlobals) {
    webrtc.registerGlobals();
  }
} catch (e) {
  console.log('ℹ️ WebRTC native globals not registered (Normal for Web/Expo Go)');
}

let device = null;
let producerTransport = null;
let producer = null;

export const mediasoupClient = {
  // שלב א: טעינת המכשיר עם יכולות השרת
  loadDevice: async (routerRtpCapabilities) => {
    try {
      device = new Device();
      await device.load({ routerRtpCapabilities });
      console.log('✅ Mediasoup Device loaded successfully');
      return device;
    } catch (error) {
      console.error('❌ Failed to load device:', error);
      throw error;
    }
  },

  // שלב ב: יצירת ערוץ שליחה (Transport) וחיבורו לסוקט
  createSendTransport: async (transportParams, socket) => {
    try {
      if (!device) throw new Error('Device not loaded');

      producerTransport = device.createSendTransport(transportParams);

      // אירוע חיבור ה-Transport לשרת (DTLS)
      producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          socket.emit('stream:connect_transport', {
            transportId: producerTransport.id,
            dtlsParameters,
          }, () => callback());
        } catch (error) {
          errback(error);
        }
      });

      // אירוע יצירת ה-Producer (התחלת הזרמת המידע)
      producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          socket.emit('stream:produce', {
            transportId: producerTransport.id,
            kind,
            rtpParameters,
            gameId: 'test-game-id' // ניתן להעביר דינמית
          }, ({ id }) => {
            callback({ id });
          });
        } catch (error) {
          errback(error);
        }
      });

      return producerTransport;
    } catch (error) {
      console.error('❌ Failed to create transport:', error);
      throw error;
    }
  },

  // שלב ג: הפקת שידור הוידאו מתוך ה-Stream
  produce: async (stream) => {
    try {
      if (!producerTransport) throw new Error('Transport not created');
      
      const videoTrack = stream.getVideoTracks()[0];
      
      if (videoTrack) {
        producer = await producerTransport.produce({ 
          track: videoTrack,
          encodings: [
            { maxBitrate: 100000 },
            { maxBitrate: 300000 },
            { maxBitrate: 900000 },
          ],
          codecOptions: { videoGoogleStartBitrate: 1000 }
        });
        console.log('✅ Producer created, ID:', producer.id);
        return producer;
      }
    } catch (error) {
      console.error('❌ Production failed:', error);
      throw error;
    }
  }
};