import { Server } from 'socket.io';
import { socketAuth } from '../middleware/socketAuth.js';

export const initializeSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const user = socket.user;

    // יצירת חדר פרטי למשתמש לפי ה-ID שלו
    if (user && user.id) {
      socket.join(user.id);
      console.log(`✅ User ${user.id} is ready for real-time updates`);
    }

    // ניתוק
    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });

  return io;
};
