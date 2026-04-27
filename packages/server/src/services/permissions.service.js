/**
 * permissions.service.js
 *
 * שכבת בדיקות הרשאות למשחק — כל פעולה מוגבלת-תפקיד עוברת דרך כאן.
 * היררכיית תפקידים: HOST > MODERATOR > PLAYER > VIEWER
 * HOST מורשה לכל מה שMODERATOR מורשה לו.
 *
 * פונקציות:
 *   validateRole(gameId, userId, requiredRole) — בדיקה גנרית לפי תפקיד, זורקת שגיאה אם נכשל
 *   ensureHost(gameId, userId)                 — קיצור: דורש תפקיד HOST
 *   ensureModerator(gameId, userId)            — קיצור: דורש תפקיד MODERATOR או HOST
 *
 * מתקשר עם: Prisma → GameParticipant
 * תלוי ב:   אין תלויות חיצוניות
 * משמש את:  game.service.js, question.service.js, וכל service שדורש הרשאות
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const permissionsService = {
  async validateRole(gameId, userId, requiredRole) {
    if (!gameId || !userId) {
      throw new Error(
        'System Error: Missing gameId or userId for permission check'
      );
    }

    const participant = await prisma.gameParticipant.findUnique({
      where: {
        gameId_userId: {
          gameId: gameId,
          userId: userId,
        },
      },
    });

    if (!participant) {
      throw new Error(
        `Permission denied: You must be a ${requiredRole} to perform this action.`
      );
    }

    // HOST יכול לעשות הכל מה שMODERATOR יכול
    const allowedRoles =
      requiredRole === 'MODERATOR' ? ['MODERATOR', 'HOST'] : [requiredRole];

    if (!allowedRoles.includes(participant.role)) {
      throw new Error(
        `Permission denied: You must be a ${requiredRole} to perform this action.`
      );
    }

    return participant;
  },

  async ensureHost(gameId, userId) {
    return this.validateRole(gameId, userId, 'HOST');
  },

  async ensureModerator(gameId, userId) {
    return this.validateRole(gameId, userId, 'MODERATOR');
  },
};

export default permissionsService;
