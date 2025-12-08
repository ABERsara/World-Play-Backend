import { PrismaClient } from '@prisma/client';
import permissionsService from './permissions.service.js';
import validationService from './validation.service.js';
const prisma = new PrismaClient();

const gameService = {
  /**
   * יצירת משחק חדש
   */
  async createGame(userId, { title, description, streamId, moderatorId }) {
    // א. האם הסטרים קיים במערכת?
    await validationService.ensureStreamExists(streamId);
    // ב. האם הסטרים פנוי?
    await validationService.validateStreamIsFree(streamId);
    // ג. האם המארח פנוי לארח ולא מארח במשחק פעיל אחר?
    await validationService.validateHostIsAvailable(userId);
    // --- יצירת המשחק ---

    // בגלל שאנחנו צריכים ליצור גם GAME וגם PARTICIPANT (עבור המארח),
    // נעשה את זה בטרנזקציה כדי שאם אחד ייכשל, הכל יתבטל.

    return await prisma.$transaction(async (tx) => {
      // 1. יצירת המשחק
      const newGame = await tx.game.create({
        data: {
          title,
          description,
          streamId,
          moderatorId: moderatorId || null, // אם לא סופק, נשמור כ-NULL
          hostId: userId, // שדה לצורכי תיעוד מהיר (אם קיים בסכימה שלך)
          status: 'WAITING', // ברירת מחדל
        },
      });

      // 2. רישום המארח כמשתתף (HOST) באופן אוטומטי
      await tx.gameParticipant.create({
        data: {
          gameId: newGame.id,
          userId: userId,
          role: 'HOST',
        },
      });

      return newGame;
    });
  },
  /**
   * הצטרפות שחקן למשחק
   * כולל ולידציה עסקית: שחקן לא יכול לשחק בשני משחקים פעילים במקביל.
   */
  async joinGame(gameId, userId, role = 'PLAYER') {
    const eligibility = await validationService.validateJoinEligibility(
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
    const game = await validationService.ensureGameExists(gameId);

    // 2. Permission: רק מארח
    await permissionsService.ensureHost(gameId, userId);

    // 3. Validation: חוקיות המעבר
    validationService.validateStatusTransition(game.status, newStatus);

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
