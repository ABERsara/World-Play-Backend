// src/sockets/game.handler.js
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import * as gameRules from '../services/validation.service.js';

const prisma = new PrismaClient();

export const registerGameHandlers = (io, socket) => {
  const user = socket.user; // המשתמש שכבר אומת ב-Auth Middleware

  // --- אירוע: הצטרפות לחדר ---
  socket.on('join_room', async ({ gameId, role = 'VIEWER' }) => {
    if (!gameId) {
      logger.error(`User ${user.username} tried to join without gameId`);
      socket.emit('error', { msg: 'Missing gameId' });
      return;
    }

    try {
      // 1. בדיקה לוגית מול ה-DB (האם המשחק קיים? פעיל? המשתמש חסום?)
      const validation = await gameRules.validateJoinEligibility(
        gameId,
        user.id,
        role
      );

      // אם המשתמש כבר רשום, רק נחבר אותו מחדש לסוקט
      if (validation.status === 'ALREADY_JOINED') {
        socket.join(gameId);
        logger.socketJoin(user, gameId);
        socket.emit('system_message', {
          msg: `Welcome back! You are connected to game ${gameId}`,
        });
        return;
      }

      // 2. רישום שחקן ב-DB  (טבלת GameParticipant)
      await prisma.gameParticipant.create({
        data: {
          gameId: gameId,
          userId: user.id,
          role: role,
          score: 0,
        },
      });

      // 3. הצטרפות פיזית לחדר בסוקט
      socket.join(gameId);
      logger.socketJoin(user, gameId);

      // 4. הודעה לשחקן שהצליח
      socket.emit('system_message', {
        msg: `Successfully joined game as ${role}`,
      });

      // 5. עדכון בזמן אמת לכל מי שבחדר (למשל: עדכון מונה צופים)
      io.to(gameId).emit('room_update', {
        type: 'USER_JOINED',
        userId: user.id,
        username: user.username,
        role: role,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(`Join Room Failed for ${user.username}`, error.message);
      socket.emit('error', { msg: error.message });
    }
  });
};
