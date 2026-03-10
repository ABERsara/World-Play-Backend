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
};

export default permissionsService;
