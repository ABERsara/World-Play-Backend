import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// הגדרת אובייקט השירות שמרכז את כל פונקציות הוולידציה
const validationService = {
  // --- בדיקות קיום (Existence) ---

  /**
   * בדיקה שמשחק קיים במערכת
   */
  async ensureGameExists(gameId) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');
    return game;
  },

  /**
   * בדיקה שסטרים קיים במערכת
   */
  async ensureStreamExists(streamId) {
    const stream = await prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) throw new Error('Stream not found');
    return stream;
  },

  /**
   * בדיקה גנרית שמשתמש קיים במערכת (לפי ID)
   */
  async ensureUserExists(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User with ID ${userId} not found`);
    return user;
  },

  /**
   * בדיקה למטרת התחברות: האם המשתמש קיים לפי אימייל?
   * מחזיר את המשתמש כדי שנוכל לבדוק סיסמה
   */
  async ensureUserExistsByEmail(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // זורקים שגיאה כללית כדי לא לחשוף אם המייל קיים או לא (Security best practice)
      throw new Error('אימייל או סיסמה שגויים.');
    }
    return user;
  },

  /**
   * בדיקה למטרת רישום: מוודא שהאימייל *לא* קיים במערכת
   */
  async validateEmailIsUnique(email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('משתמש עם אימייל זה כבר קיים.');
    }
  },

  async ensureNotificationExists(notificationId) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new Error('Notification not found');
    return notification;
  },

  // --- בדיקות סטטוס משחק ---

  validateGameIsActive(game) {
    if (game.status !== 'ACTIVE') {
      throw new Error(`Action not allowed. Game is currently ${game.status}`);
    }
  },

  validateStatusTransition(currentStatus, newStatus) {
    if (currentStatus === 'FINISHED') {
      throw new Error('Cannot change status of a finished game');
    }
    if (currentStatus === newStatus) {
      throw new Error(`Game is already ${newStatus}`);
    }
  },

  async validateStreamIsFree(streamId) {
    const busyStreamGame = await prisma.game.findFirst({
      where: {
        streamId: streamId,
        status: { in: ['WAITING', 'ACTIVE'] },
      },
    });

    if (busyStreamGame) {
      throw new Error(
        `Stream is currently busy with another game: "${busyStreamGame.title}"`
      );
    }
  },

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

  // --- ולידציות מורכבות להצטרפות ---

  async validateJoinEligibility(gameId, userId, requestedRole) {
    // שימוש בפונקציה מתוך האובייקט הנוכחי באמצעות this
    const game = await this.ensureGameExists(gameId);

    if (game.status === 'FINISHED') {
      throw new Error('Cannot join a finished game');
    }

    if (requestedRole === 'HOST' && game.hostId !== userId) {
      throw new Error('Unauthorized: You are not the host of this game');
    }

    if (requestedRole === 'MODERATOR') {
      if (game.moderatorId && game.moderatorId !== userId) {
        throw new Error(
          'Unauthorized: You are not the assigned moderator for this game'
        );
      }
    }

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

    if (requestedRole === 'HOST') {
      const hostTaken = await prisma.gameParticipant.findFirst({
        where: { gameId, role: 'HOST' },
      });

      if (hostTaken && hostTaken.userId !== userId) {
        throw new Error(`This game already has a registered HOST.`);
      }
    }

    return { status: 'ELIGIBLE', game };
  },

  // --- ולידציות תוכן וכלליות ---

  validateQuestionData(questionText, options) {
    if (!questionText || questionText.trim().length === 0) {
      throw new Error('Question text cannot be empty');
    }
    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new Error('A question must have at least 2 options');
    }
  },

  validateNonEmptyText(text, fieldName = 'Content') {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error(`${fieldName} cannot be empty`);
    }
  },

  async ensureChatParticipantsExist(senderId, receiverId) {
    if (senderId === receiverId) {
      throw new Error('You cannot send a message to yourself');
    }
    await Promise.all([
      this.ensureUserExists(senderId), // שימוש ב-this
      this.ensureUserExists(receiverId), // שימוש ב-this
    ]);
  },

  mergeUniqueIds(...arrays) {
    const combined = arrays.flat();
    return [...new Set(combined)];
  },

  getSignificantInteractionRules() {
    return [{ duration: { gt: 60 } }, { participationPercent: { gt: 0.2 } }];
  },
};

// ייצוא כלים נפוצים לשימוש קל יותר (Destructuring)
export const {
  ensureGameExists,
  ensureStreamExists,
  ensureUserExists,
  ensureNotificationExists,
} = validationService;

// ייצוא ברירת המחדל של אובייקט השירות המלא
export default validationService;
