import { PrismaClient } from '@prisma/client';
import permissionsService from './permissions.service.js';
import * as gameRules from '../services/validation.service.js';
const prisma = new PrismaClient();

async function cancelOldGames(userId) {
  return await prisma.game.updateMany({
    where: {
      hostId: userId,
      status: { in: ['WAITING', 'ACTIVE'] },
    },
    data: { status: 'FINISHED' },
  });
}

const gameService = {
  async createGame(userId, { title, description, moderatorId }) {
    // בדיקה שהמארח פנוי
    await gameRules.validateHostIsAvailable(userId);

    // ביטול משחקים ישנים - עכשיו זה ירוץ בוודאות
    await cancelOldGames(userId);

    // טרנזקציה
    return await prisma.$transaction(async (tx) => {
      const newStream = await tx.stream.create({
        data: {
          title: `Stream for: ${title}`,
          hostId: userId,
          status: 'WAITING',
        },
      });

      const newGame = await tx.game.create({
        data: {
          title,
          description,
          streamId: newStream.id,
          moderatorId: moderatorId || null,
          hostId: userId,
          status: 'WAITING',
        },
      });

      await tx.gameParticipant.create({
        data: {
          gameId: newGame.id,
          userId: userId,
          role: 'HOST',
        },
      });

      return { ...newGame, streamId: newStream.id };
    });
  },

  async joinGame(gameId, userId, role = 'PLAYER') {
    const eligibility = await gameRules.validateJoinEligibility(
      gameId,
      userId,
      role
    );
    if (eligibility.status === 'ALREADY_JOINED') {
      return { participant: eligibility.participant, alreadyJoined: true };
    }

    const newParticipant = await prisma.gameParticipant.create({
      data: { gameId, userId, role, score: 0 },
    });
    return { alreadyJoined: false, participant: newParticipant };
  },

  async updateGameStatus(gameId, userId, newStatus) {
    const game = await gameRules.ensureGameExists(gameId);
    await permissionsService.ensureHost(gameId, userId);
    gameRules.validateStatusTransition(game.status, newStatus);

    const dataToUpdate = { status: newStatus };
    const now = new Date();
    if (newStatus === 'ACTIVE' && !game.startedAt) dataToUpdate.startedAt = now;
    else if (newStatus === 'FINISHED') dataToUpdate.finishedAt = now;

    return await prisma.game.update({
      where: { id: gameId },
      data: dataToUpdate,
    });
  },

  async getFollowedFeed(userId) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    return await prisma.game.findMany({
      where: {
        hostId: { in: followingIds },
        status: { in: ['WAITING', 'ACTIVE'] },
      },
      include: {
        host: { select: { username: true, followersCount: true } },
        stream: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};

export default gameService;
