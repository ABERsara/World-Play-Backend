/**
 * socket.service.js (server)
 *
 * אתחול שרת Socket.IO וניהול אירועי חיבור/ניתוק.
 * מטפל בשני תרחישים עיקריים:
 *   1. חיבור — הצטרפות לחדר פרטי לפי userId (להתראות אישיות)
 *   2. ניתוק — סגירה אוטומטית של משחקים פעילים כשמארח מתנתק
 *
 * מתקשר עם: Prisma → Game, Socket.IO rooms
 * תלוי ב:   socketAuth (middleware), game.handler.js, game.service.js
 * משמש את:  server.js (קריאה ל-initializeSocketIO בהפעלה)
 *
 * TODO: cors origin: '*' — יש להגביל לדומיין הידוע לפני פרודקשן
 */
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
    }

    socket.on('disconnect', async () => {
      if (user && user.id) {
        try {
          const activeGames = await prisma.game.findMany({
            where: { hostId: user.id, status: 'ACTIVE' },
          });

          for (const game of activeGames) {
            await gameService.updateGameStatus(game.id, user.id, 'FINISHED');
            io.to(game.id).emit('game_status_update', {
              gameId: game.id,
              status: 'FINISHED',
            });
          }
        } catch {
          // כישלון בניקוי לא אמור לפיל את השרת
        }
      }
    });
  });

  return io;
};
