// src/services/socket.service.js
import { Server } from 'socket.io';
import { socketAuth } from '../middleware/socketAuth.js';
import { logger } from '../utils/logger.js'; // <--- ייבוא הלוגר

export const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const user = socket.user;

    // שימוש בלוגר הנקי במקום console.log ארוך
    logger.socketConnect(user, socket.id);

    // --- אירועים ---

    socket.on('join_room', ({ gameId }) => {
      if (!gameId) {
        logger.error(`User ${user.username} tried to join without gameId`);
        return;
      }

      socket.join(gameId);
      // לוג ייעודי להצטרפות
      logger.socketJoin(user, gameId);

      // אופציונלי: שליחת הודעה חזרה
      socket.emit('system_message', { msg: `Joined ${gameId}` });
    });

    socket.on('disconnect', (reason) => {
      logger.socketDisconnect(user, socket.id, reason);
    });
  });

  logger.system('Socket.io Service Initialized');
  return io;
};
