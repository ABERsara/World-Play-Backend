import { PrismaClient } from '@prisma/client';
import * as msService from '../services/mediasoup.service.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// ניהול זכרון זמני (In-Memory)
const streams = {};    
const transports = {}; 
const producers = {};  
const consumers = {};  

export const registerStreamHandlers = (io, socket) => {
  
  const user = socket.user; 
  
  if (user) {
    logger.info(`👤 Socket connected: ${user.username} (${user.id})`);
  }

  // --- 1. יצירת חדר (עבור הסטרים) ---
  socket.on('stream:create_room', async ({ streamId }, callback) => {
    try {
      logger.info(`Creating room for stream: ${streamId}`);

      if (!streams[streamId]) {
        const worker = msService.getWorker();
        const router = await msService.createRouter(worker);
        
        streams[streamId] = { 
          router, 
          hostSocketId: socket.id,
          hostUserId: user ? user.id : 'dev-host'
        };
      }
      
      const router = streams[streamId].router;
      callback({ rtpCapabilities: router.rtpCapabilities });

    } catch (error) {
      logger.error('Error creating room:', error);
      callback({ error: error.message });
    }
  });

  // --- 2. יצירת Transport ---
  socket.on('stream:create_transport', async ({ streamId }, callback) => {
    try {
      const streamRoom = streams[streamId];
      if (!streamRoom) return callback({ error: 'Stream Room not found' });

      const transport = await msService.createWebRtcTransport(streamRoom.router);
      
      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          transport.close();
          delete transports[transport.id];
        }
      });

      transports[transport.id] = transport;

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });

    } catch (error) {
      logger.error('Error creating transport:', error);
      callback({ error: error.message });
    }
  });

  // --- 3. חיבור Transport ---
  socket.on('stream:connect_transport', async ({ transportId, dtlsParameters }, callback) => {
    try {
      const transport = transports[transportId];
      if (!transport) return callback({ error: 'Transport not found' });
      
      await transport.connect({ dtlsParameters });
      callback({ success: true });

    } catch (error) {
      logger.error('Error connecting transport:', error);
      callback({ error: error.message });
    }
  });

  // --- 4. התחלת שידור (Produce) + עדכון DB ---
  socket.on('stream:produce', async ({ transportId, kind, rtpParameters, streamId }, callback) => {
    try {
      const transport = transports[transportId];
      if (!transport) return callback({ error: 'Transport not found' });

      // הפעלת Mediasoup
      const producer = await transport.produce({ kind, rtpParameters });
      producers[producer.id] = producer;

      logger.info(`🎥 New Producer (${kind}) for Stream: ${streamId}`);

      if (streams[streamId]) {
          streams[streamId].producerId = producer.id; // <--- הנה זה! שומרים אותו למי שיבוא אחר כך
      }
      // עדכון צופים
      socket.to(streamId).emit('stream:new_producer', { producerId: producer.id });

      const exists = await prisma.stream.findUnique({ where: { id: streamId } });
      
      if (!exists) {
         return callback({ error: 'Stream ID not found in DB' });
      }
      // === עדכון הדאטהבייס ===
      if (kind === 'video') {
        try {
            await prisma.stream.update({
                where: { id: streamId }, 
                data: { 
                    status: 'LIVE',
                    startTime: new Date()
                }
            });
            logger.info(`✅ Database Updated: Stream ${streamId} is LIVE`);
        } catch (dbError) {
            logger.warn(`⚠️ DB Update skipped: ${dbError.message}`);
        }
      }

      callback({ id: producer.id });

    } catch (error) {
      logger.error('Error producing:', error);
      callback({ error: error.message });
    }
  });

  // --- 5. צפייה (Consume) ---
  socket.on('stream:consume', async ({ transportId, producerId, rtpCapabilities, streamId }, callback) => {
    try {
      const transport = transports[transportId];
      const streamRoom = streams[streamId];
      
      if (!transport || !streamRoom) return callback({ error: 'Not found' });

      const router = streamRoom.router;

      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'RTP Capabilities not supported' });
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      consumers[consumer.id] = consumer;

      consumer.on('transportclose', () => { delete consumers[consumer.id]; });
      consumer.on('producerclose', () => { 
        delete consumers[consumer.id];
        socket.emit('stream:producer_closed', { producerId });
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });

      await consumer.resume();

    } catch (error) {
      logger.error('Error consuming:', error);
      callback({ error: error.message });
    }
  });
  // --- אירוע: הצטרפות צופה לסטרים (הקוד המתוקן) ---
  socket.on('stream:join', async ({ streamId }, callback) => {
    try {
      const streamRoom = streams[streamId];
      
      // אם הסטרים עדיין לא נוצר ע"י המארח
      if (!streamRoom) {
        return callback({ error: 'Stream is not live yet' });
      }

      logger.info(`👋 Viewer joining stream: ${streamId}`);

      // 1. קודם כל מכניסים את הסוקט לחדר (כדי שיקבל עדכונים עתידיים)
      socket.join(streamId);

      // 2. מחזירים תשובה אחת מסודרת לקליינט
      callback({ 
        rtpCapabilities: streamRoom.router.rtpCapabilities,
        // התיקון הקריטי שעשינו קודם - שליחת ה-ID אם השידור כבר התחיל
        currentProducerId: streamRoom.producerId || null 
      });

    } catch (error) {
      logger.error('Error joining stream:', error);
      callback({ error: error.message });
    }
  });
};
