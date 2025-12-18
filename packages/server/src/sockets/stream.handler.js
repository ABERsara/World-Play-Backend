import { PrismaClient } from '@prisma/client';
import * as msService from '../services/mediasoup.service.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// ניהול זכרון זמני לחדרים פעילים (Live RAM)
// שומרים את האובייקטים הטכניים של Mediasoup שאי אפשר לשמור ב-DB
const rooms = {};      // gameId -> { router, hostSocketId, hostUserId }
const transports = {}; // transportId -> transport object
const producers = {};  // producerId -> producer object
const consumers = {};  // consumerId -> consumer object

export const registerStreamHandlers = (io, socket) => {
  
  // 1. אבטחה: שליפת המשתמש מתוך הסוקט
  // (המשתמש הוצמד לסוקט ע"י ה-Middleware של ה-Auth שיצרנו קודם)
  const user = socket.user; 
  
  if (user) {
    logger.info(`👤 Socket connected to stream handler: ${user.username} (${user.id})`);
  } else {
    // במקרה של בדיקות או התחברות ללא טוקן תקין
    logger.warn(`⚠️ Unauthenticated socket connection: ${socket.id}`);
  }

  // --- אירוע 1: יצירת חדר (רק למנחה) ---
  socket.on('stream:create_room', async ({ gameId }, callback) => {
    try {
      logger.info(`Creating room for game: ${gameId}`);

      // אם החדר לא קיים בזיכרון - ניצור אותו
      if (!rooms[gameId]) {
        const worker = msService.getWorker();
        const router = await msService.createRouter(worker);
        
        rooms[gameId] = { 
          router, 
          hostSocketId: socket.id,
          hostUserId: user ? user.id : 'dev-host' // שומרים מי פתח את החדר
        };
      }
      
      const router = rooms[gameId].router;
      // מחזירים לקליינט את יכולות הוידאו של השרת (RTP Capabilities)
      callback({ rtpCapabilities: router.rtpCapabilities });

    } catch (error) {
      logger.error('Error creating room:', error);
      callback({ error: error.message });
    }
  });

  // --- אירוע 2: יצירת Transport (הצינור) ---
  socket.on('stream:create_transport', async ({ gameId }, callback) => {
    try {
      const room = rooms[gameId];
      if (!room) return callback({ error: 'Room not found. Host must create it first.' });

      const transport = await msService.createWebRtcTransport(room.router);
      
      // ניקוי זיכרון כשהצינור נסגר
      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          transport.close();
          delete transports[transport.id];
        }
      });

      // שמירה בזיכרון של השרת
      transports[transport.id] = transport;

      // החזרת הפרמטרים לקליינט כדי שיוכל להתחבר
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

  // --- אירוע 3: חיבור Transport (הלחיצת יד) ---
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

  // --- אירוע 4: התחלת שידור (Produce) - הלב של המערכת! ---
  socket.on('stream:produce', async ({ transportId, kind, rtpParameters, gameId }, callback) => {
    try {
      const transport = transports[transportId];
      if (!transport) return callback({ error: 'Transport not found' });

      // 1. הפעלת השידור ברמת Mediasoup
      const producer = await transport.produce({ kind, rtpParameters });
      producers[producer.id] = producer;

      logger.info(`🎥 New Producer (${kind}): ${producer.id} for Game: ${gameId}`);

      // 2. עדכון כל המשתתפים בחדר שיש שידור חדש
      socket.to(gameId).emit('stream:new_producer', { producerId: producer.id });

      // 3. עדכון ה-DB (לוגיקה עסקית)
      // נעדכן סטטוס ל-LIVE רק כשמתחיל וידאו (ולא אודיו בנפרד), ורק אם זה משחק אמיתי
      if (kind === 'video' && gameId !== 'web-test-room') {
        try {
            await prisma.stream.update({
                where: { id: gameId }, // מניח ש-gameId הוא ה-ID בטבלת Stream
                data: { 
                    status: 'LIVE',
                    start_time: new Date()
                }
            });
            logger.info(`✅ Database Updated: Game ${gameId} is now LIVE`);
        } catch (dbError) {
            // לא נכשיל את השידור אם ה-DB נכשל (למשל אם ה-ID לא קיים בטסטים)
            logger.warn(`⚠️ DB Update skipped for game ${gameId}: ${dbError.message}`);
        }
      }

      callback({ id: producer.id });

    } catch (error) {
      logger.error('Error producing:', error);
      callback({ error: error.message });
    }
  });

  // --- אירוע 5: צפייה (Consume) - לצופים ---
  socket.on('stream:consume', async ({ transportId, producerId, rtpCapabilities, gameId }, callback) => {
    try {
      const transport = transports[transportId];
      const room = rooms[gameId];
      
      if (!transport) return callback({ error: 'Transport not found' });
      if (!room) return callback({ error: 'Room not found' });

      const router = room.router;

      // בדיקת תאימות מכשיר
      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'RTP Capabilities not supported' });
      }

      // יצירת ה-Consumer (הצד שקולט את השידור)
      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // מתחילים ב-Pause כדי לא לאבד מידע עד שהלקוח מוכן
      });

      consumers[consumer.id] = consumer;

      // ניהול סגירות
      consumer.on('transportclose', () => { delete consumers[consumer.id]; });
      consumer.on('producerclose', () => { 
        delete consumers[consumer.id];
        socket.emit('stream:producer_closed', { producerId });
      });

      // שליחת נתונים ללקוח
      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });

      // הפעלה
      await consumer.resume();
      logger.info(`👀 New Consumer: ${consumer.id} for user ${user ? user.username : 'Guest'}`);

    } catch (error) {
      logger.error('Error consuming:', error);
      callback({ error: error.message });
    }
  });
};