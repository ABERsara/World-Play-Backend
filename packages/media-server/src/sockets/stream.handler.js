import { PrismaClient } from '@prisma/client';
import * as msService from '../services/mediasoup.service.js';
import { logger } from '../utils/logger.js';
import { StreamService } from '../services/stream.service.js';
import { SOCKET_EVENTS } from '@worldplay/shared';
const prisma = new PrismaClient();

export const streams = {};
const transports = {};
const producers = {};

export const registerStreamHandlers = (io, socket) => {
  const user = socket.user;

  if (user) {
    logger.info(`Socket connected: ${user.username} (${user.id})`);
  }

  socket.on(SOCKET_EVENTS.STREAM.INIT_BROADCAST, async (data, callback) => {
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

  socket.on(
    SOCKET_EVENTS.STREAM.CREATE_ROOM,
    async ({ streamId }, callback) => {
      try {
        if (!streams[streamId]) {
          const worker = msService.getWorker();
          const router = await msService.createRouter(worker);
          streams[streamId] = {
            router,
            hostSocketId: socket.id,
            hostUserId: user ? user.id : 'dev-host',
            transports: new Map(), // הוספנו מפה לניהול טרנספורטים בתוך החדר
          };
        }
        callback({ rtpCapabilities: streams[streamId].router.rtpCapabilities });
      } catch (error) {
        callback({ error: error.message });
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.STREAM.CREATE_TRANSPORT,
    async ({ streamId }, callback) => {
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
            streamRoom.transports.delete(transport.id);
          }
        });
        transports[transport.id] = transport;
        streamRoom.transports.set(transport.id, transport); // שמירה בחדר עבור ה-Consume

        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (error) {
        callback({ error: error.message });
      }
    }
  );

  socket.on(
    SOCKET_EVENTS.STREAM.CONNECT_TRANSPORT,
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

  socket.on(SOCKET_EVENTS.STREAM.PRODUCE, async (data, callback) => {
    try {
      let actualData = data;

      if (Array.isArray(data)) actualData = data[0];

      if (typeof actualData === 'string') {
        try {
          actualData = JSON.parse(actualData.trim());
        } catch (parseError) {
          console.error(
            ' JSON Parse failed:',
            parseError.message,
            'String received:',
            actualData
          );
        }
      }

      console.log('DEBUG FINAL OBJECT:', actualData);

      // שינוי ל-let כי אנחנו עשויים לעדכן את rtpParameters
      let { transportId, kind, rtpParameters, streamId } = actualData || {};

      if (!kind) {
        console.error(' Kind is missing! Type of data:', typeof actualData);
        if (typeof callback === 'function')
          callback({ error: 'kind is required' });
        return;
      }

      const streamRoom = streams[streamId];
      if (!streamRoom)
        throw new Error('Room not found. Call stream:create_room first.');

      let transport = transports[transportId];
      if (!transport) {
        console.log(`Creating temporary transport for testing...`);
        transport = await msService.createWebRtcTransport(streamRoom.router);
        transports[transport.id] = transport;
        streamRoom.transports.set(transport.id, transport);
        console.log(`Temporary transport created with ID: ${transport.id}`);
      }

      // 2. הוספת Codecs ו-Encodings אם הם חסרים
      if (
        !rtpParameters ||
        !rtpParameters.codecs ||
        rtpParameters.codecs.length === 0
      ) {
        rtpParameters = {
          mid: 'v',
          codecs: [
            {
              mimeType: 'video/vp8',
              payloadType: 101,
              clockRate: 90000,
              parameters: { 'x-google-start-bitrate': 1000 },
            },
          ],
          encodings: [{ ssrc: 11111111 }],
        };
      } else if (
        !rtpParameters.encodings ||
        rtpParameters.encodings.length === 0
      ) {
        rtpParameters.encodings = [{ ssrc: 11111111 }];
      }

      // 3. יצירת ה-Producer
      const producer = await transport.produce({ kind, rtpParameters });
      producers[producer.id] = producer;

      // 4. בדיקת תפקיד והפעלת FFmpeg
      const role = await validateParticipantRole(streamId, socket.user.id);

      if (kind === 'video' && (role === 'HOST' || role === 'PLAYER')) {
        console.log(
          `🚀 [STREAM B] Video producer detected. Preparing FFmpeg...`
        );

        await prisma.stream.update({
          where: { id: streamId },
          data: { status: 'LIVE', startTime: new Date() },
        });

        // הוספת השהיה של 1.5 שניות לפני תחילת ההקלטה
        setTimeout(async () => {
          try {
            console.log(
              `🎬 [FFMPEG] Starting pipeline now for stream: ${streamId}`
            );
            await StreamService.startRecording(
              streamId,
              streamRoom.router,
              producer // כאן עובר הפרודיוסר של הוידאו
            );
          } catch (err) {
            console.error('❌ FFmpeg Start Error:', err);
          }
        }, 1500);
      }

      if (typeof callback === 'function') callback({ id: producer.id });
      console.log(`✅ Success! Stream ID: ${streamId}`);
    } catch (err) {
      console.error('❌ Produce Error:', err.message);
      if (typeof callback === 'function') callback({ error: err.message });
    }
  });

  socket.on(SOCKET_EVENTS.STREAM.CONSUME, async (data, callback) => {
    try {
      const actualData =
        typeof data === 'string' ? JSON.parse(data.trim()) : data;
      const { streamId, transportId, producerId, rtpCapabilities } = actualData;

      console.log(`📡 [CONSUME] Request for producer: ${producerId}`);

      const room = streams[streamId];
      if (!room) return callback({ error: 'Room not found' });

      const transport = room.transports.get(transportId);
      if (!transport) return callback({ error: 'Transport not found' });

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'Cannot consume' });
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });

      consumer.on('transportclose', () => {
        console.log('Consumer transport closed');
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (consumeError) {
      console.error('❌ Consume error:', consumeError);
      callback({ error: consumeError.message });
    }
  });

  socket.on(SOCKET_EVENTS.STREAM.JOIN, async ({ streamId }, callback) => {
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

  socket.on(SOCKET_EVENTS.STREAM.ENDED, async () => {
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
