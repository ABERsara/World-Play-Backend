import { Server } from 'socket.io';
import { socketAuth } from '../middleware/socketAuth.js';
import { logger } from '../utils/logger.js';
import { registerGameHandlers } from '../sockets/game.handler.js';

export const initializeSocketIO = (httpServer) => {
  // בדיקה 1: האם נכנסנו לפונקציה?
  console.log('socket.service.js -> STARTING INIT');

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // בדיקה 2: האם ה-io נוצר?
  console.log('socket.service.js -> IO Created');

  io.use(socketAuth);

  io.on('connection', (socket) => {
    // בדיקה 3: האם מישהו מתחבר?
    console.log('socket.service.js -> NEW CONNECTION:', socket.id);

    const user = socket.user;
    logger.socketConnect(user, socket.id);

    registerGameHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.socketDisconnect(user, socket.id, reason);
    });
  });

  logger.system('Socket.io Service Initialized');

  // בדיקה 4: האם הגענו לסוף?
  console.log('socket.service.js -> FINISHED INIT');

  return io;
};
