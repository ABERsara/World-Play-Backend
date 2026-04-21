import { Server } from 'socket.io';
import { registerGameHandlers } from '../sockets/game.handler.js';
import { socketAuth } from '../middleware/socketAuth.js';
import gameService from './game.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // כאן אנחנו מחליפים את ה-console.log הפשוט בלוגיקה חכמה
    socket.on('disconnect', async () => {
      console.log('❌ User disconnected:', socket.id);
      if (user && user.id) {
        try {
          const activeGames = await prisma.game.findMany({
            where: { hostId: user.id, status: 'ACTIVE' },
          });

          for (const game of activeGames) {
            console.log(
              `⚠️ Host ${user.username} disconnected. Closing game ${game.id}`
            );
            // אנחנו קוראים לסרוויס - הוא כבר ידאג לעדכן את ה-DB ולשלוח Axios למדיה
            await gameService.updateGameStatus(game.id, user.id, 'FINISHED');

            io.to(game.id).emit('game_status_update', {
              gameId: game.id,
              status: 'FINISHED',
            });
          }
        } catch (err) {
          console.error('Cleanup on disconnect failed:', err.message);
        }
      }
    });
  });

  return io;
};
