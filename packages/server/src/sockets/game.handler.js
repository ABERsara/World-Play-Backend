import { PrismaClient } from '@prisma/client';
import { JoinGameSchema } from '@worldplay/shared'; 
import { logger } from '../utils/logger.js';
import * as gameRules from '../services/validation.service.js';

const prisma = new PrismaClient();

export const registerGameHandlers = (io, socket) => {
  const user = socket.user; 

  // --- אירוע: הצטרפות לחדר ---
  socket.on('join_room', async (payload) => { // מקבלים את כל האובייקט (payload)
    
    // שלב 1: ולידציה מבנית (Zod) - השומר בכניסה
    // אנחנו בודקים את המידע שהגיע מהלקוח מול הסכמה המשותפת
    const validationResult = JoinGameSchema.safeParse(payload);

    if (!validationResult.success) {
      // התיקון: הוספת סימן שאלה (?) אחרי user ושימוש בערך ברירת מחדל
      const username = user?.username || 'Unknown/Guest';
      
console.warn(`Validation failed for user ${username}`, JSON.stringify(validationResult.error.format(), null, 2));      
      socket.emit('error', { 
        msg: 'Invalid data format', 
        details: validationResult.error.format() 
      });
      return; 
    }

    // מעכשיו משתמשים בנתונים הנקיים שעברו ולידציה
    const { gameId, role } = validationResult.data; 

    // שלב 2: ולידציה עסקית (DB) - הלוגיקה הקיימת שלך
    
    if (socket.rooms.has(gameId)) {
      logger.info(`User ${user.username} is already in socket room ${gameId}`);
      socket.emit('system_message', {
        msg: 'You are already connected to this room.',
      });
      return;
    }

    try {
      // המשך הלוגיקה המקורית שלך נשאר זהה לחלוטין!
      // ההבדל היחיד הוא שאנחנו בטוחים ש-gameId הוא באמת מחרוזת תקינה
      
      const validation = await gameRules.validateJoinEligibility(
        gameId,
        user.id,
        role || 'VIEWER' // ברירת מחדל אם לא הוגדר בסכמה
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