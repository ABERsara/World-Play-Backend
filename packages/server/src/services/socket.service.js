import { Server } from 'socket.io';
import { registerGameHandlers } from '../sockets/game.handler.js';
import { socketAuth } from '../middleware/socketAuth.js';
export const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    registerGameHandlers(io, socket);

    const user = socket.user;
    if (user && user.id) {
      socket.join(user.id);
      console.log(`✅ User ${user.id} joined private room`);
    }

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });

  return io;
};
