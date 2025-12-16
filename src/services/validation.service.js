import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- בדיקות קיום (Existence) ---

export const ensureGameExists = async (gameId) => {
  // חיפוש ישיר - UUID הוא מחרוזת וצריך להישאר כזו
  const game = await prisma.game.findUnique({
    where: { id: gameId },
  });

  if (!game) throw new Error('Game not found');
  return game;
};

export const ensureStreamExists = async (streamId) => {
  const stream = await prisma.stream.findUnique({ where: { id: streamId } });
  if (!stream) throw new Error('Stream not found');
  return stream;
};

export const ensureUserExists = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User with ID ${userId} not found`);
  return user;
};

export const ensureUserExistsByEmail = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('אימייל או סיסמה שגויים.');
  return user;
};

export const validateEmailIsUnique = async (email) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error('משתמש עם אימייל זה כבר קיים.');
};

export const ensureNotificationExists = async (notificationId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification) throw new Error('Notification not found');
  return notification;
};

// --- בדיקות סטטוס וזמינות ---

export const validateGameIsActive = (game) => {
  if (game.status !== 'ACTIVE') {
    throw new Error(`Action not allowed. Game is currently ${game.status}`);
  }
};

export const validateStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === 'FINISHED')
    throw new Error('Cannot change status of a finished game');
  if (currentStatus === newStatus)
    throw new Error(`Game is already ${newStatus}`);
};

export const validateStreamIsFree = async (streamId) => {
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
};

// הפונקציה שגרמה לשגיאה - עכשיו היא מיוצאת כראוי
export const validateUserHasNoActiveStream = async (userId) => {
  const activeStream = await prisma.stream.findFirst({
    where: {
      hostId: userId,
      status: { in: ['WAITING', 'LIVE', 'PAUSE'] },
    },
  });

  if (activeStream) {
    throw new Error(
      `You already have an active stream: "${activeStream.title}". Please finish it before.`
    );
  }
};

export const validateHostIsAvailable = async (userId) => {
  const activeEngagement = await prisma.gameParticipant.findFirst({
    where: {
      userId: userId,
      game: { status: { in: ['WAITING', 'ACTIVE'] } },
    },
    include: { game: true },
  });
  if (activeEngagement) {
    throw new Error(
      `You cannot host a new game while active in: "${activeEngagement.game.title}"`
    );
  }
};

// --- ולידציות מורכבות ---

export const validateJoinEligibility = async (
  gameId,
  userId,
  requestedRole
) => {
  const game = await ensureGameExists(gameId); // קריאה ישירה לפונקציה (בלי this)

  if (game.status === 'FINISHED')
    throw new Error('Cannot join a finished game');

  if (requestedRole === 'HOST' && game.hostId !== userId) {
    throw new Error('Unauthorized: You are not the host of this game');
  }

  const existingParticipant = await prisma.gameParticipant.findUnique({
    where: { gameId_userId: { gameId, userId } },
  });

  if (existingParticipant) {
    if (existingParticipant.role === requestedRole) {
      return { status: 'ALREADY_JOINED', participant: existingParticipant };
    }
    throw new Error(`Conflict: Already joined as ${existingParticipant.role}.`);
  }

  return { status: 'ELIGIBLE', game };
};

// --- עזרים ותוכן ---

export const validateQuestionData = (questionText, options) => {
  if (!questionText?.trim()) throw new Error('Question text cannot be empty');
  if (!Array.isArray(options) || options.length < 2)
    throw new Error('At least 2 options required');
};

export const ensureChatParticipantsExist = async (senderId, receiverId) => {
  if (senderId === receiverId)
    throw new Error('You cannot send a message to yourself');
  await Promise.all([ensureUserExists(senderId), ensureUserExists(receiverId)]);
};
export const getSignificantInteractionRules = () => {
  return [{ duration: { gt: 60 } }, { participationPercent: { gt: 0.2 } }];
};

export const mergeUniqueIds = (...arrays) => {
  const combined = arrays.flat();
  return [...new Set(combined)];
};

// ייצוא אובייקט ברירת מחדל למי שמעדיף לייבא את הכל יחד
export default {
  ensureGameExists,
  ensureStreamExists,
  ensureUserExists, // וודאי שזה כאן
  ensureUserExistsByEmail,
  validateEmailIsUnique,
  validateUserHasNoActiveStream,
  validateStreamIsFree,
  validateJoinEligibility,
  validateQuestionData,
  ensureChatParticipantsExist,
  getSignificantInteractionRules, // חובה להוסיף
  mergeUniqueIds, // חובה להוסיף
};
