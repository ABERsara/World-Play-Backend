// packages/client/src/services/MediasoupClient.js
import { Device } from 'mediasoup-client';
import { registerGlobals } from 'react-native-webrtc';
import { Base64 } from 'base-64';

// 1. Polyfills חובה ל-React Native
registerGlobals();
global.btoa = Base64.btoa;
global.atob = Base64.atob;

let device = null;
let producerTransport = null;
let consumerTransport = null;
let producer = null;

export const mediasoupClient = {
  // 1. אתחול המכשיר (טעינת יכולות)
  loadDevice: async (routerRtpCapabilities) => {
    try {
      device = new Device();
      await device.load({ routerRtpCapabilities });
      console.log('✅ Device loaded successfully');
      return device;
    } catch (error) {
      if (error.name === 'UnsupportedError') {
        console.error('❌ Browser not supported');
      }
      throw error;
    }
  },

  // 2. יצירת Transport לשידור (Send)
  createSendTransport: async (data, socket) => {
    producerTransport = device.createSendTransport(data);

    // אירוע: ה-Transport מוכן וצריך להתחבר לשרת (DTLS)
    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        // שולחים לשרת את בקשת החיבור
        socket.emit('stream:connect_transport', {
          transportId: producerTransport.id,
          dtlsParameters,
        }, () => callback());
      } catch (error) {
        errback(error);
      }
    });

    // אירוע: התחלת השידור בפועל
    producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        // שולחים לשרת בקשה לשדר
        socket.emit('stream:produce', {
          transportId: producerTransport.id,
          kind,
          rtpParameters,
          gameId: 'test-game-id' // נצטרך להעביר את זה דינמית בהמשך
        }, ({ id }) => {
          callback({ id });
        });
      } catch (error) {
        errback(error);
      }
    });

    return producerTransport;
  },

  // 3. פעולת השידור עצמה (הפעלת המצלמה)
  produce: async (stream) => {
    if (!device) throw new Error('Device not loaded');
    
    // לוקחים את טראק הוידאו מהמצלמה
    const videoTrack = stream.getVideoTracks()[0];
    // const audioTrack = stream.getAudioTracks()[0]; // נפעיל בהמשך

    if (videoTrack) {
        producer = await producerTransport.produce({ track: videoTrack });
    }
    
    return producer;
  }
};