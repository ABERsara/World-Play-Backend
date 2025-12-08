import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const gameService = {
  /**
   * יצירת משחק חדש
   * כולל ולידציות עסקיות:
   * 1. הסטרים פנוי (אין משחק אחר WAITING/ACTIVE).
   * 2. המארח פנוי (אין לו משחק אחר ACTIVE).
   */
  async createGame(hostId, { title, description, streamId, moderatorId }) {
    // --- ולידציה 1: בדיקת זמינות הסטרים (Stream Constraint) ---
    // חוק: סטרים יכול להכיל רק משחק אחד פעיל או ממתין בכל רגע נתון.
    const activeGameOnStream = await prisma.game.findFirst({
      where: {
        streamId: streamId,
        status: { in: ['WAITING', 'ACTIVE'] }, // נתפוס גם ממתינים וגם פעילים
      },
    });

    if (activeGameOnStream) {
      throw new Error(
        `Stream is already occupied by game: ${activeGameOnStream.title}`
      );
    }
    // --- ולידציה 2: בדיקת זמינות המארח (Host Constraint) ---
    // חוק: מארח לא יכול לנהל שני משחקים פעילים במקביל.
    const hostHasActiveGame = await prisma.game.findFirst({
      where: {
        hostId: hostId,
        status: 'ACTIVE',
      },
    });

    if (hostHasActiveGame) {
      throw new Error(
        'You already have an ACTIVE game. Please finish it first.'
      );
    }
    // --- יצירת המשחק (אם הכל תקין) ---
    return await prisma.game.create({
      data: {
        title,
        description,
        hostId,
        streamId,
        moderatorId,
        status: 'WAITING',

        participants: {
          create: {
            userId: hostId,
            role: 'HOST',
            score: 0,
          },
        },
      },
      include: {
        participants: true,
      },
    });
  },
  /**
   * הצטרפות שחקן למשחק
   * כולל ולידציה עסקית: שחקן לא יכול לשחק בשני משחקים פעילים במקביל.
   */
  async joinGame(gameId, userId, role = 'PLAYER') {
    // 1. שליפת המשחק הנוכחי
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });
    if (!game) throw new Error('Game not found');
    if (game.status !== 'WAITING')
      throw new Error(`Cannot join game. Current status: ${game.status}`);

    // --- ולידציות אבטחה (Security) ---
    if (role === 'MODERATOR' && game.moderatorId !== userId) {
      throw new Error(
        'Unauthorized: You are not assigned as moderator for this game'
      );
    }
    if (role === 'HOST' && game.hostId !== userId) {
      throw new Error('Unauthorized: You are not the host of this game');
    }

    // --- ולידציה 3: בדיקת זמינות שחקן (Player Constraint) ---
    // חוק: שחקן יכול להירשם לכמה משחקי WAITING, אבל אסור לו להיות ביותר ממשחק ACTIVE אחד.
    // אם השחקן מנסה להצטרף כ-PLAYER, נבדוק אם הוא כבר משחק כרגע במקום אחר.
    if (role === 'PLAYER') {
      const currentlyPlaying = await prisma.gameParticipant.findFirst({
        where: {
          userId: userId,
          role: 'PLAYER',
          game: {
            status: 'ACTIVE',
          },
        },
      });

      if (currentlyPlaying) {
        throw new Error(
          'You are already playing in another ACTIVE game. Finish it before joining a new one.'
        );
      }
    }

    // --- בדיקת כפילות במשחק הנוכחי ---
    const existingParticipant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
    });

    if (existingParticipant) {
      return { alreadyJoined: true, participant: existingParticipant };
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
  async updateGameStatus(gameId, status) {
    const dataToUpdate = { status };

    // אם הסטטוס הוא "הסתיים", אנחנו נועלים את זמן הסיום
    if (status === 'FINISHED') {
      dataToUpdate.finishedAt = new Date();
    }

    return await prisma.game.update({
      where: { id: gameId },
      data: dataToUpdate,
    });
  },
};

export default gameService;
