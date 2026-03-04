import { PrismaClient } from '@prisma/client';
import * as msService from '../services/mediasoup.service.js';
import { logger } from '../utils/logger.js';
import { StreamService } from '../services/stream.service.js';

const prisma = new PrismaClient();

export const streams = {};
const transports = {};
const producers = {};
const consumers = {};

export const registerStreamHandlers = (io, socket) => {
  const user = socket.user;

  if (user) {
    logger.info(`Socket connected: ${user.username} (${user.id})`);
  }

  socket.on('stream:init_broadcast', async (data, callback) => {
    try {
      logger.info(`Initiating broadcast for user: ${user.id}`);
      const response = await fetch('http://app-server:8080/api/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${socket.handshake.auth.token}`,
        },
        body: JSON.stringify({ title: data.title || 'שידור חדש' }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Failed to create stream in DB');
      callback({ streamId: result.stream.id });
    } catch (error) {
      logger.error(`Failed to init broadcast: ${error.message}`);
      callback({ error: error.message });
    }
  });

  socket.on('stream:create_room', async ({ streamId }, callback) => {
    try {
      if (!streams[streamId]) {
        const worker = msService.getWorker();
        const router = await msService.createRouter(worker);
        streams[streamId] = {
          router,
          hostSocketId: socket.id,
          hostUserId: user ? user.id : 'dev-host',
        };
      }
      callback({ rtpCapabilities: streams[streamId].router.rtpCapabilities });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('stream:create_transport', async ({ streamId }, callback) => {
    try {
      const streamRoom = streams[streamId];
      if (!streamRoom) return callback({ error: 'Stream Room not found' });
      const transport = await msService.createWebRtcTransport(
        streamRoom.router
      );
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
      callback({ error: error.message });
    }
  });

  socket.on(
    'stream:connect_transport',
    async ({ transportId, dtlsParameters }, callback) => {
      try {
        const transport = transports[transportId];
        if (!transport) return callback({ error: 'Transport not found' });
        await transport.connect({ dtlsParameters });
        callback({ success: true });
      } catch (error) {
        callback({ error: error.message });
      }
    }
  );

  socket.on('stream:produce', async (data, callback) => {
    try {
      // שיפור החילוץ: אם data הוא מערך, קח את האיבר הראשון. אם לא, קח את data עצמו.
      const actualData = Array.isArray(data) ? data[0] : data;

      console.log('DEBUG RAW DATA:', JSON.stringify(actualData)); // לוג שיעזור לנו לראות מה הגיע

      let { transportId, kind, rtpParameters, streamId } = actualData || {};

      if (!kind) {
        console.error('❌ Kind is missing! Received:', actualData);
        return callback({ error: 'kind is required (video/audio)' });
      }

      const streamRoom = streams[streamId];
      if (!streamRoom)
        throw new Error('Room not found. Call stream:create_room first.');

      // 1. טיפול בטרנספורט (הגרסה הסלחנית)
      let transport = transports[transportId];
      if (!transport) {
        console.log(`⚠️ Creating temporary transport for testing...`);
        transport = await msService.createWebRtcTransport(streamRoom.router);
        transports[transport.id] = transport;
      }

      // 2. הוספת Codecs אם הם חסרים (כדי למנוע את השגיאה params.codecs)
      // 2. הוספת Codecs ו-Encodings אם הם חסרים (כדי למנוע שגיאות rtpMapping)
      if (
        !rtpParameters ||
        !rtpParameters.codecs ||
        rtpParameters.codecs.length === 0
      ) {
        rtpParameters = {
          mid: 'v', // הוספנו Media ID
          codecs: [
            {
              mimeType: 'video/vp8',
              payloadType: 101,
              clockRate: 90000,
              parameters: { 'x-google-start-bitrate': 1000 },
            },
          ],
          encodings: [{ ssrc: 11111111 }], // זה ה-SSRC שהיה חסר לו!
        };
      } else if (
        !rtpParameters.encodings ||
        rtpParameters.encodings.length === 0
      ) {
        // גם אם הקליינט שלח קודקים אבל שכח encodings
        rtpParameters.encodings = [{ ssrc: 11111111 }];
      }

      // 3. יצירת ה-Producer
      const producer = await transport.produce({ kind, rtpParameters });
      producers[producer.id] = producer;

      // 4. בדיקת תפקיד והפעלת FFmpeg
      const role = await validateParticipantRole(streamId, socket.user.id);

      if (kind === 'video' && (role === 'HOST' || role === 'PLAYER')) {
        console.log(`🚀 [STREAM B] Launching FFmpeg Pipeline...`);

        // עדכון DB
        await prisma.stream.update({
          where: { id: streamId },
          data: { status: 'LIVE', startTime: new Date() },
        });

        // הפעלת ההקלטה
        await StreamService.startRecording(
          streamId,
          streamRoom.router,
          producer
        );
      }

      if (typeof callback === 'function') callback({ id: producer.id });
      console.log(`✅ Success! Stream ID: ${streamId}`);
    } catch (err) {
      console.error('❌ Produce Error:', err.message);
      if (typeof callback === 'function') callback({ error: err.message });
    }
  });
  socket.on(
    'stream:consume',
    async (
      { transportId, producerId, rtpCapabilities, streamId },
      callback
    ) => {
      try {
        const transport = transports[transportId];
        const streamRoom = streams[streamId];
        if (!transport || !streamRoom) return callback({ error: 'Not found' });
        if (!streamRoom.router.canConsume({ producerId, rtpCapabilities })) {
          return callback({ error: 'Cannot consume' });
        }
        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: true,
        });
        consumers[consumer.id] = consumer;
        callback({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
        await consumer.resume();
      } catch (error) {
        callback({ error: error.message });
      }
    }
  );

  socket.on('stream:join', async ({ streamId }, callback) => {
    try {
      const streamRoom = streams[streamId];
      if (!streamRoom) return callback({ error: 'Stream is not live yet' });
      socket.join(streamId);
      callback({
        rtpCapabilities: streamRoom.router.rtpCapabilities,
        currentProducerId: streamRoom.producerId || null,
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  socket.on('disconnect', async () => {
    for (const streamId in streams) {
      if (streams[streamId].hostSocketId === socket.id) {
        await handleCloseStream(streamId, io);
      }
    }
  });
};

export const handleCloseStream = async (streamId, io) => {
  const streamRoom = streams[streamId];
  if (!streamRoom) return;
  if (streamRoom.router) streamRoom.router.close();
  try {
    await prisma.stream.update({
      where: { id: streamId },
      data: { status: 'FINISHED', endTime: new Date() },
    });
  } catch (err) {
    logger.error(err.message);
  }
  io.to(streamId).emit('stream:ended', { streamId });
  delete streams[streamId];
};
async function validateParticipantRole(streamId, userId) {
  const participant = await prisma.gameParticipant.findFirst({
    where: { game: { streamId }, userId },
  });
  return participant?.role || 'VIEWER';
}

// async function setupStreamB(streamId, rtpParameters, role) {
//   console.log(`[STREAM B] 🎥 Initializing FFmpeg for ${role}...`);
// const streamRoom = streams[streamId];
//  if (!streamRoom || !streamRoom.router) {
//     throw new Error(`Room or Router not found for stream ${streamId}. Did you call stream:create_room?`);
//   }
// // אנחנו צריכים את ה-producer של הוידאו כדי להקליט אותו
// const producer = Object.values(producers).find(p => p.kind === 'video');

// if (!producer) throw new Error("No video producer found to record");

// await StreamService.startRecording(streamId, streamRoom.router, producer);

//   // עדכון סטטוס ל-LIVE עם זמן התחלה
//   await prisma.stream.update({
//     where: { id: streamId },
//     data: { status: 'LIVE', startTime: new Date() }
//   });

//   //  מעבירים ל-Service את ה-router מהחדר
//   await StreamService.startRecording(streamId, streamRoom.router, {
//     kind: 'video',
//     rtpParameters
//   });

//   console.log("✅ STREAM B READY");
// }
