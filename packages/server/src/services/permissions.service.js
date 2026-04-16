// src/services/permissions.service.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const permissionsService = {
  /**
   * בדיקה גנרית: האם למשתמש יש תפקיד מסוים במשחק ספציפי?
   */
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

  // --- קיצורי דרך נוחים ---

  async ensureHost(gameId, userId) {
    return this.validateRole(gameId, userId, 'HOST');
  },

  async ensureModerator(gameId, userId) {
    return this.validateRole(gameId, userId, 'MODERATOR');
  },

  /**
   * בדיקת מגבלת מצלמות (מקסימום 4)
   */
  async checkCameraLimit(gameId) {
    const activeCameras = await prisma.gameParticipant.count({
      where: {
        gameId,
        isCameraActive: true,
      },
    });

    if (activeCameras >= 4) {
      throw new Error('Camera limit reached: maximum 4 cameras allowed');
    }

    return activeCameras;
  },

  /**
   * הדלקה/כיבוי מצלמה לשחקן
   */
  async toggleCamera(gameId, userId) {
    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    // אם רוצה להדליק — בדוק מגבלה
    if (!participant.isCameraActive) {
      await this.checkCameraLimit(gameId);
    }

    return await prisma.gameParticipant.update({
      where: { gameId_userId: { gameId, userId } },
      data: { isCameraActive: !participant.isCameraActive },
    });
  },

  /**
   * האצלת סמכות: Host נותן לשחקן הרשאה להזמין מנחה
   */
  async grantModeratorInvite(gameId, hostId, targetUserId) {
    // רק Host יכול לתת הרשאה
    await this.ensureHost(gameId, hostId);

    const target = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId: targetUserId } },
    });

    if (!target) {
      throw new Error('Target participant not found');
    }

    return await prisma.gameParticipant.update({
      where: { gameId_userId: { gameId, userId: targetUserId } },
      data: { canInviteModerator: !target.canInviteModerator },
    });
  },
};

export default permissionsService;
