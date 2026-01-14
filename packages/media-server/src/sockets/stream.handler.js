import { PrismaClient } from '@prisma/client';
import * as msService from '../services/mediasoup.service.js';
import { logger } from '../utils/logger.js';

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

  socket.on(
    'stream:produce',
    async ({ transportId, kind, rtpParameters, streamId }, callback) => {
      try {
        const transport = transports[transportId];
        if (!transport) return callback({ error: 'Transport not found' });
        const producer = await transport.produce({ kind, rtpParameters });
        producers[producer.id] = producer;
        if (streams[streamId]) streams[streamId].producerId = producer.id;
        socket
          .to(streamId)
          .emit('stream:new_producer', { producerId: producer.id });

        if (kind === 'video') {
          await prisma.stream.update({
            where: { id: streamId },
            data: { status: 'LIVE', startTime: new Date() },
          });
        }
        callback({ id: producer.id });
      } catch (error) {
        callback({ error: error.message });
      }
    }
  );

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
