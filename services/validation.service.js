import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const validationService = {
  // --- בדיקות קיום (Existence) ---

  async ensureGameExists(gameId) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');
    return game;
  },

  async ensureStreamExists(streamId) {
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    return stream;
  },

  // --- בדיקות סטטוס משחק ---

  /**
   * מוודא שהמשחק במצב שמאפשר פעילות (לא נגמר ולא בהמתנה - תלוי בצורך)
   */
  validateGameIsActive(game) {
    if (game.status !== 'ACTIVE') {
      throw new Error(`Action not allowed. Game is currently ${game.status}`);
    }
  },

  /**
   * בודק אם מותר לשנות סטטוס (למשל: אי אפשר להחזיר משחק שהסתיים)
   */
  validateStatusTransition(currentStatus, newStatus) {
    if (currentStatus === 'FINISHED') {
      throw new Error('Cannot change status of a finished game');
    }
    if (currentStatus === newStatus) {
      throw new Error(`Game is already ${newStatus}`);
    }
  },
  /**
   * 1. בדיקה שהסטרים פנוי
   * סטרים נחשב תפוס אם יש עליו משחק בסטטוס WAITING או ACTIVE
   */
  async validateStreamIsFree(streamId) {
    const busyStreamGame = await prisma.game.findFirst({
      where: {
        streamId: streamId,
        status: { in: ['WAITING', 'ACTIVE'] }, // סטטוסים שחוסמים את הסטרים
      },
    });

    if (busyStreamGame) {
      throw new Error(
        `Stream is currently busy with another game: "${busyStreamGame.title}"`
      );
    }
  },
  /**
   * בדיקה: האם למשתמש כבר יש סטרים פעיל (WAITING/LIVE/PAUSE)?
   * מונע מצב שלמארח יש כמה סטרימים פתוחים במקביל.
   */
  async validateUserHasNoActiveStream(userId) {
    const activeStream = await prisma.stream.findFirst({
      where: {
        hostId: userId,
        status: { in: ['WAITING', 'LIVE', 'PAUSE'] },
      },
    });

    if (activeStream) {
      throw new Error(
        `You already have an active stream: "${activeStream.title}". Please finish it before creating a new one.`
      );
    }
  },
  /**
   * 2. בדיקה שהמארח פנוי
   * המארח לא יכול ליצור משחק חדש אם הוא כבר מארח (או משחק) במשחק פעיל אחר
   */
  async validateHostIsAvailable(userId) {
    const activeEngagement = await prisma.gameParticipant.findFirst({
      where: {
        userId: userId,
        game: {
          status: { in: ['WAITING', 'ACTIVE'] },
        },
      },
      include: { game: true },
    });

    if (activeEngagement) {
      throw new Error(
        `You cannot host a new game while hosting another active/waiting game: "${activeEngagement.game.title}"`
      );
    }
  },
  // --- ולידציות מורכבות להצטרפות (Join Game) ---

  async validateJoinEligibility(gameId, userId, requestedRole) {
    // 1. האם המשחק קיים?
    const game = await this.ensureGameExists(gameId);

    // 2. האם המשחק סגור להצטרפות?
    if (game.status === 'FINISHED') {
      throw new Error('Cannot join a finished game');
    }

    // 3. בדיקת זהות ואבטחה
    // האם המשתמש *מורשה* להיות המארח או המנחה של המשחק הספציפי הזה?
    if (requestedRole === 'HOST' && game.hostId !== userId) {
      throw new Error('Unauthorized: You are not the host of this game');
    }

    if (requestedRole === 'MODERATOR') {
      // אם הוגדר מנחה ספציפי למשחק, רק הוא יכול להצטרף כמנחה
      // (הערה: אם game.moderatorId הוא NULL, אז אולי המערכת פתוחה לכל מנחה?
      // הקוד כאן מניח שאם יש מנחה רשום, חובה שזה יהיה הוא)
      if (game.moderatorId && game.moderatorId !== userId) {
        throw new Error(
          'Unauthorized: You are not the assigned moderator for this game'
        );
      }
    }

    // 4. האם המשתמש כבר קיים בטבלת המשתתפים?
    const existingParticipant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
    });

    if (existingParticipant) {
      if (existingParticipant.role === requestedRole) {
        return { status: 'ALREADY_JOINED', participant: existingParticipant };
      } else {
        throw new Error(
          `Conflict: You are already joined as ${existingParticipant.role}. Cannot join as ${requestedRole}.`
        );
      }
    }

    // 5. חוק ייחודי לשחקנים: האם הוא משחק במשחק פעיל אחר כרגע?
    if (requestedRole === 'PLAYER') {
      const activeGame = await prisma.gameParticipant.findFirst({
        where: {
          userId: userId,
          role: 'PLAYER',
          game: { status: { in: ['WAITING', 'ACTIVE'] } },
        },
        include: { game: true },
      });

      if (activeGame) {
        throw new Error(
          `User is already playing in active game: ${activeGame.game.title}`
        );
      }
    }

    // 6. וידוא שאין כפילות מארחים (למקרה שה-DB לא מסונכרן)
    // הערה: הבדיקה בסעיף 3 כבר מכסה את הרוב, אבל זה גיבוי טוב
    if (requestedRole === 'HOST') {
      const hostTaken = await prisma.gameParticipant.findFirst({
        where: { gameId, role: 'HOST' },
      });

      // אם יש כבר מארח, והוא לא אני (למרות שעברתי את סעיף 3, אולי יש באג בנתונים)
      if (hostTaken && hostTaken.userId !== userId) {
        throw new Error(`This game already has a registered HOST.`);
      }
    }

    return { status: 'ELIGIBLE', game };
  },

  // --- ולידציות תוכן (Content) ---

  validateQuestionData(questionText, options) {
    if (!questionText || questionText.trim().length === 0) {
      throw new Error('Question text cannot be empty');
    }
    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new Error('A question must have at least 2 options');
    }
  },
};

export default validationService;
