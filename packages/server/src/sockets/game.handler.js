import { PrismaClient } from '@prisma/client';
import { JoinGameSchema, SOCKET_EVENTS } from '@worldplay/shared';
import { logger } from '../utils/logger.js';
import * as gameRules from '../services/validation.service.js';
import gameService from '../services/game.service.js';

const prisma = new PrismaClient();

export const registerGameHandlers = (io, socket) => {
  const user = socket.user;

  // ---אירוע: הצטרפות לחדר ---
  socket.on(SOCKET_EVENTS.GAME.JOIN, async (payload) => {
    // שלב 1: ולידציה מבנית (Zod) - השומר בכניסה
    // אנחנו בודקים את המידע שהגיע מהלקוח מול הסכמה המשותפת
    const validationResult = JoinGameSchema.safeParse(payload);

    if (!validationResult.success) {
      const username = user?.username || 'Unknown/Guest';

      console.warn(
        `Validation failed for user ${username}`,
        JSON.stringify(validationResult.error.format(), null, 2)
      );
      socket.emit('error', {
        msg: 'Invalid data format',
        details: validationResult.error.format(),
      });
      return;
    }

    // מעכשיו משתמשים בנתונים הנקיים שעברו ולידציה
    const { gameId, role } = validationResult.data;

    // שלב 2: ולידציה עסקית (DB)

    if (socket.rooms.has(gameId)) {
      logger.info(`User ${user.username} is already in socket room ${gameId}`);
      socket.emit('system_message', {
        msg: 'You are already connected to this room.',
      });
      return;
    }

    try {
      const validation = await gameRules.validateJoinEligibility(
        gameId,
        user.id,
        role || 'VIEWER'
      );

      if (validation.status === 'ALREADY_JOINED') {
        socket.join(gameId);
        logger.socketJoin(user, gameId);
        socket.emit('system_message', {
          msg: `Welcome back! You are connected to game ${gameId}`,
        });
        return;
      }

      // רישום שחקן ב-DB
      await prisma.gameParticipant.create({
        data: {
          gameId: gameId,
          userId: user.id,
          role: role || 'VIEWER',
          score: 0,
        },
      });

      // הצטרפות פיזית לחדר בסוקט
      socket.join(gameId);
      logger.socketJoin(user, gameId);

      socket.emit('system_message', {
        msg: `Successfully joined game as ${role}`,
      });

      io.to(gameId).emit(SOCKET_EVENTS.GAME.ROOM_UPDATE, {
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
  // בתוך registerGameHandlers ב-App-Server
  socket.on(SOCKET_EVENTS.GAME.CREATE, async (payload, callback) => {
    try {
      const { title, description } = payload;

      const game = await gameService.createGame(user.id, {
        title,
        description,
      });

      console.log(`🎮 Game created via Socket: ${game.id} by ${user.username}`);

      // מחזירים לקליינט את הנתונים, כולל ה-streamId שהסרוויס יצר בטרנזקציה
      callback({
        success: true,
        gameId: game.id,
        streamId: game.streamId, // מתקן: זה מה שמוחזר מ-gameService
      });
    } catch (error) {
      console.error('Socket game:create error:', error);
      callback({ error: 'נכשל ביצירת משחק: ' + error.message });
    }
  });
  socket.on(SOCKET_EVENTS.GAME.PLACE_BET, async (payload) => {
    try {
      const { gameId, questionId, optionId, amount } = payload;
      const userId = socket.user.id;

      console.log(` Bet Received via Socket: User ${userId} on Game ${gameId}`);

      // עדכון ה-DB בטרנזקציה
      await prisma.$transaction([
        prisma.userAnswer.create({
          data: {
            userId,
            questionId,
            selectedOptionId: optionId,
            wager: amount,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { walletBalance: { decrement: amount } },
        }),
      ]);

      // שליפת הפונקציה ושידור העדכון לכולם
      const { syncUserBalances } = await import('../utils/balanceSync.js');
      await syncUserBalances(io, userId, gameId);
    } catch (error) {
      console.error('❌ Socket Bet Error:', error.message);
      socket.emit('error', { msg: 'ההימור נכשל' });
    }
  });

  socket.on(SOCKET_EVENTS.GAME.STATUS_UPDATE, async (payload, callback) => {
    try {
      const { gameId, status } = payload;
      const userId = socket.user.id;

      const validStatuses = ['WAITING', 'ACTIVE', 'FINISHED'];

      if (!status || !validStatuses.includes(status.toUpperCase())) {
        return callback({
          error: `סטטוס לא תקין. ערכים מותרים: ${validStatuses.join(', ')}`,
        });
      }

      const updatedGame = await gameService.updateGameStatus(
        gameId,
        userId,
        status.toUpperCase()
      );

      io.emit('game_status_update', {
        gameId,
        status: status.toUpperCase(),
      });

      callback({ success: true, game: updatedGame });
    } catch (error) {
      console.error('Socket status update error:', error);
      callback({ error: error.message });
    }
  });
};
