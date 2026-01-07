import { Device } from 'mediasoup-client';
import { emitPromise } from './socket.service';

let device = null;

export const MediasoupManager = {
  // אתחול המכשיר
  async initDevice(routerRtpCapabilities) {
    try {
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

  // יצירת טרנספורט (מתאים גם לשידור וגם לצפייה)
  async createTransport(socket, direction, streamId) {
    if (!device) throw new Error('Device not initialized');

    // בקשת פרמטרים מהשרת
    const params = await emitPromise('stream:create_transport', { streamId, direction });
    
    // יצירת הטרנספורט בצד הלקוח
    const transport = direction === 'send' 
      ? device.createSendTransport(params) 
      : device.createRecvTransport(params);

    // אירוע חיבור הטרנספורט
    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await emitPromise('stream:connect_transport', { 
          transportId: transport.id, 
          dtlsParameters, 
          streamId 
        });
        callback();
      } catch (err) { 
        errback(err); 
      }
    });

    // אירוע הפקת מדיה (רק לצד המשדר)
    if (direction === 'send') {
      transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          const { id } = await emitPromise('stream:produce', { 
            transportId: transport.id, 
            kind, 
            rtpParameters, 
            streamId 
          });
          callback({ id });
        } catch (err) { 
          errback(err); 
        }
      });
    }

    return transport;
  }
};