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
    await gameRules.validateHostIsAvailable(userId);
    await cancelOldGames(userId);

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

      // ✅ רישום פעילות למארח
      await tx.userGameActivity.create({
        data: {
          userId: userId,
          gameId: newGame.id,
          relationType: 'HOST',
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

    // ✅ רישום פעילות למשתתף
    await prisma.userGameActivity.upsert({
      where: {
        userId_gameId: { userId, gameId },
      },
      update: {},
      create: {
        userId,
        gameId,
        relationType: role,
      },
    });

    return { alreadyJoined: false, participant: newParticipant };
  },

  async updateGameStatus(gameId, userId, newStatus) {
    const game = await gameRules.ensureGameExists(gameId);
    await permissionsService.ensureHost(gameId, userId);
    gameRules.validateStatusTransition(game.status, newStatus);

    const dataToUpdate = { status: newStatus };
    const now = new Date();

    if (newStatus === 'ACTIVE' && !game.startedAt) {
      dataToUpdate.startedAt = now;
    } else if (newStatus === 'FINISHED') {
      dataToUpdate.finishedAt = now;
    }

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

  async getGameHistory(userId) {
    const activities = await prisma.userGameActivity.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      include: {
        game: {
          include: {
            host: { select: { id: true, username: true } },
            userPoints: {
              where: { userId },
              select: { pointType: true, amount: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pinned = activities.filter((a) => a.isPinned);
    const notPinned = activities.filter((a) => !a.isPinned);
    const combined = [...pinned, ...notPinned].slice(0, 10);

    const withBreakdown = combined.map((a) => {
      const breakdown = { TRIVIA: 0, DONATION: 0, BONUS: 0, GAME: 0 };
      for (const point of a.game.userPoints) {
        if (breakdown[point.pointType] !== undefined) {
          breakdown[point.pointType] += Number(point.amount);
        }
      }
      const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
      return { ...a, breakdown, total };
    });

    return {
      all: withBreakdown,
      asHost: withBreakdown.filter((a) => a.relationType === 'HOST'),
      asPlayer: withBreakdown.filter((a) =>
        ['PLAYER', 'VIEWER', 'MODERATOR'].includes(a.relationType)
      ),
    };
  },

  async togglePin(userId, gameId) {
    const activity = await prisma.userGameActivity.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });

    if (!activity) throw new Error('Activity not found');

    return await prisma.userGameActivity.update({
      where: { userId_gameId: { userId, gameId } },
      data: { isPinned: !activity.isPinned },
    });
  },

  async getGameViewers(gameId, currentUserId) {
    const viewLogs = await prisma.viewLog.findMany({
      where: { gameId },
      select: { userId: true },
    });

    const viewerIds = [...new Set(viewLogs.map((v) => v.userId))];

    const follows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: viewerIds },
      },
      select: { followingId: true },
    });

    const followerIds = new Set(follows.map((f) => f.followingId));

    return {
      total: viewerIds.length,
      followers: viewerIds.filter((id) => followerIds.has(id)).length,
      casual: viewerIds.filter((id) => !followerIds.has(id)).length,
    };
  },
};

export default gameService;
