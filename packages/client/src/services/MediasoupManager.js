import { Device } from 'mediasoup-client';
import * as Base64 from 'base-64';
import { emitMediaPromise } from './socket.service';
import { mediaDevices, registerGlobals } from 'react-native-webrtc';
import { SOCKET_EVENTS } from '@worldplay/shared';

// --- POLYFILLS (קריטי ל-React Native) ---
if (typeof global.btoa === 'undefined') {
  global.btoa = (str) => Base64.encode(str);
}
if (typeof global.atob === 'undefined') {
  global.atob = (str) => Base64.decode(str);
}

let device = null;

// ensure react-native-webrtc globals (RTCPeerConnection, etc.) are available
if (typeof global.RTCPeerConnection === 'undefined') {
  try {
    registerGlobals();
    console.log('✅ react-native-webrtc globals registered');
  } catch (e) {
    console.warn('Could not register react-native-webrtc globals', e);
  }
}

export const MediasoupManager = {
  // אתחול המכשיר
  async initDevice(routerRtpCapabilities) {
    try {
      // ensure globals registered before constructing
      if (typeof global.RTCPeerConnection === 'undefined') {
        registerGlobals();
      }

      device = new Device();
      await device.load({ routerRtpCapabilities });
      console.log('✅ Mediasoup Device loaded successfully');
      return device;
    } catch (error) {
      console.error('Failed to load device:', error);
      throw error;
    }
  },

  // פונקציית העזר שהייתה חסרה - קריטית לצופה!
  getRtpCapabilities() {
    if (!device) {
      throw new Error('Device not initialized. Call initDevice first.');
    }
    return device.rtpCapabilities;
  },

  async getLocalStream() {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user', // מצלמה קדמית
          width: 640,
          height: 480,
          frameRate: 30,
        },
      });
      return stream;
    } catch (err) {
      console.warn('getLocalStream failed, returning null', err);
      return null;
    }
  },
  // יצירת טרנספורט (מתאים גם לשידור וגם לצפייה)
  async createTransport(socket, direction, streamId) {
    if (!device) throw new Error('Device not initialized');

    // 1. שימוש ב-STREAM.CREATE_TRANSPORT
    const params = await emitMediaPromise(
      SOCKET_EVENTS.STREAM.CREATE_TRANSPORT,
      {
        streamId,
        direction,
      }
    );

    const transport =
      direction === 'send'
        ? device.createSendTransport(params)
        : device.createRecvTransport(params);

    // 2. אירוע חיבור הטרנספורט - STREAM.CONNECT_TRANSPORT
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await emitMediaPromise(SOCKET_EVENTS.STREAM.CONNECT_TRANSPORT, {
          transportId: transport.id,
          dtlsParameters,
          streamId,
        });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    // 3. אירוע הפקת מדיה - STREAM.PRODUCE
    if (direction === 'send') {
      transport.on(
        'produce',
        async ({ kind, rtpParameters }, callback, errback) => {
          try {
            const { id } = await emitMediaPromise(
              SOCKET_EVENTS.STREAM.PRODUCE,
              {
                transportId: transport.id,
                kind,
                rtpParameters,
                streamId,
              }
            );
            callback({ id });
          } catch (err) {
            errback(err);
          }
        }
      );
    }

    return transport;
  },
};
