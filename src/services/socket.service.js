// src/services/socket.service.js
import { Server } from 'socket.io';
import { socketAuth } from '../middleware/socketAuth.js';
import { logger } from '../utils/logger.js';
import { registerGameHandlers } from '../sockets/game.handler.js';

export const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.socketConnect(user, socket.id);

    // אנחנו שולחים לה את ה-io וה-socket כדי שנדע עם מי לדבר
    registerGameHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.socketDisconnect(user, socket.id, reason);
    });
  });

  logger.system('Socket.io Service Initialized');
  return io;
};
