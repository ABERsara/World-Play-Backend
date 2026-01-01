//game.service.js
import { PrismaClient } from '@prisma/client';
import permissionsService from './permissions.service.js';
import * as gameRules from '../services/validation.service.js'; // ודאי שהקובץ הזה קיים בתיקיית services
const prisma = new PrismaClient();

const gameService = {
  /**
   * יצירת משחק חדש (כולל יצירת סטרים אוטומטית!)
   * המארח שולח רק פרטי משחק, אנחנו דואגים לשאר.
   */
  async createGame(userId, { title, description, moderatorId }) {
    
    // בדיקה שהמארח פנוי (לפי הלוגיקה שלך)
    await gameRules.validateHostIsAvailable(userId); // (הערה: תוודאי שיש לך את זה או תשימי בהערה בינתיים)

    // --- טרנזקציה: יצירת סטרים + משחק + משתתף במכה אחת ---
    return await prisma.$transaction(async (tx) => {
      
      // 1. יצירת סטרים אוטומטית (מוסתר מהמשתמש)
      // לפי האפיון: הסטרים מתחיל ב-WAITING
      const newStream = await tx.stream.create({
        data: {
          title: `Stream for: ${title}`,
          hostId: userId,
          status: 'WAITING'
        }
      });

      // 2. יצירת המשחק (מקושר לסטרים שיצרנו הרגע)
      const newGame = await tx.game.create({
        data: {
          title,
          description,
          streamId: newStream.id, // <--- הקישור הקריטי!
          moderatorId: moderatorId || null,
          hostId: userId,
          status: 'WAITING'
        },
      });

      // 3. רישום המארח כמשתתף (HOST)
      await tx.gameParticipant.create({
        data: {
          gameId: newGame.id,
          userId: userId,
          role: 'HOST',
        },
      });

      // אנחנו מחזירים את אובייקט המשחק, אבל "מזריקים" לתוכו גם את ה-Stream ID
      // כדי שהקליינט ידע לאן להתחבר ב-WebRTC
      return {
        ...newGame,
        streamId: newStream.id 
      };
    });
  },
  /**
   * הצטרפות שחקן למשחק
   * כולל ולידציה עסקית: שחקן לא יכול לשחק בשני משחקים פעילים במקביל.
   */
  async joinGame(gameId, userId, role = 'PLAYER') {
    const eligibility = await gameRules.validateJoinEligibility(
      gameId,
      userId,
      role
    );

    if (eligibility.status === 'ALREADY_JOINED') {
      return { participant: eligibility.participant, alreadyJoined: true };
    }

    // 3. יצירת המשתתף
    const newParticipant = await prisma.gameParticipant.create({
      data: {
        gameId,
        userId,
        role: role,
        score: 0,
      },
    });

    return { alreadyJoined: false, participant: newParticipant };
  },

  // עדכון סטטוס המשחק
  async updateGameStatus(gameId, userId, newStatus) {
    //הרשאות אבטחה וולידציות
    // 1. Validation: קיום המשחק
    const game = await gameRules.ensureGameExists(gameId);

    // 2. Permission: רק מארח
    await permissionsService.ensureHost(gameId, userId);

    // 3. Validation: חוקיות המעבר
    gameRules.validateStatusTransition(game.status, newStatus);

    // לוגיקה עסקית
    const dataToUpdate = { status: newStatus };

    const now = new Date();
    // א. המארח לחץ "התחל משחק" (Go Live)
    if (newStatus === 'ACTIVE') {
      if (!game.startedAt) {
        dataToUpdate.startedAt = now;
      }
    }

    // ב. המארח לחץ "סיים משחק"
    else if (newStatus === 'FINISHED') {
      dataToUpdate.finishedAt = now; // נועלים את זמן הסיום
    }
    //עדכון הסטטוס במסד הנתונים
    return await prisma.game.update({
      where: { id: gameId },
      data: dataToUpdate,
    });
  },
};

export default gameService;
