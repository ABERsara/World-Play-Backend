import { PrismaClient } from '@prisma/client';
import * as gameRules from './validation.service.js';

const prisma = new PrismaClient();

const inboxService = {
  async getMyInbox(userId, page = 1, limit = 5) {
    await gameRules.ensureUserExists(userId);

    const skip = (page - 1) * limit;

    const [follows, gifts, notifications, readFollowMarkers] =
      await Promise.all([
        prisma.follow.findMany({
          where: { followingId: userId },
          include: { follower: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.transaction.findMany({
          where: { userId: userId, type: 'GIFT' },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.notification.findMany({
          where: { userId, isRead: false, NOT: { title: 'READ_MARKER' } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.notification.findMany({
          where: { userId, title: 'READ_MARKER' },
          select: { message: true },
        }),
      ]);

    const readFollowIds = readFollowMarkers.map((m) =>
      m.message.replace('FOLLOW_READ_', '')
    );

    const unreadFollows = follows
      .filter((f) => !readFollowIds.includes(f.id))
      .map((f) => ({ ...f, type: 'FOLLOW', timestamp: f.createdAt }));

    const unreadGifts = gifts
      .filter((g) => !g.metadata || g.metadata.isRead !== true)
      .map((g) => ({ ...g, type: 'GIFT', timestamp: g.createdAt }));

    const systemNotifications = notifications.map((n) => ({
      ...n,
      type: 'SYSTEM_NOTIFICATION',
      timestamp: n.createdAt,
    }));

    const allItems = [
      ...unreadFollows,
      ...unreadGifts,
      ...systemNotifications,
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const paginatedItems = allItems.slice(skip, skip + limit);

    return {
      items: await this.normalizeInboxData(userId, paginatedItems),
      pagination: {
        page,
        limit,
        hasMore: allItems.length > skip + limit,
        totalCount: allItems.length,
      },
    };
  },

  async normalizeInboxData(userId, items) {
    return await Promise.all(
      items.map(async (item) => {
        if (item.type === 'FOLLOW') {
          const mutual = await prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: userId,
                followingId: item.followerId,
              },
            },
          });
          return {
            id: item.id,
            type: 'FOLLOW',
            title: 'עוקב חדש',
            content: `${item.follower.username} התחיל לעקוב אחריך`,
            timestamp: item.timestamp,
            metadata: {
              senderId: item.followerId,
              username: item.follower.username,
              isMutual: !!mutual,
            },
          };
        }

        if (item.type === 'GIFT') {
          return {
            id: item.id,
            type: 'GIFT',
            title: 'קיבלת מתנה!',
            content: `קיבלת מתנה בשווי ${item.amount} מטבעות`,
            timestamp: item.timestamp,
            metadata: {
              amount: item.amount,
              gameId: item.gameId,
              description: item.description || 'מתנה ממעריץ',
            },
          };
        }

        return {
          id: item.id,
          type: 'SYSTEM_NOTIFICATION',
          title: item.title,
          content: item.message,
          timestamp: item.timestamp,
          metadata: {},
        };
      })
    );
  },

  async markItemAsRead(id, type, userId) {
    const normalizedType = type.toUpperCase();

    if (normalizedType === 'FOLLOW') {
      // וידוא שהעוקב שייך למשתמש
      const follow = await prisma.follow.findUnique({ where: { id } });
      if (!follow || follow.followingId !== userId) {
        throw new Error('Unauthorized');
      }
      return await prisma.notification.create({
        data: {
          user: { connect: { id: userId } },
          title: 'READ_MARKER',
          message: `FOLLOW_READ_${id}`,
          isRead: true,
        },
      });
    }

    if (normalizedType === 'GIFT') {
      // וידוא שהמתנה שייכת למשתמש
      const gift = await prisma.transaction.findUnique({ where: { id } });
      if (!gift || gift.userId !== userId) {
        throw new Error('Unauthorized');
      }
      return await prisma.transaction.update({
        where: { id },
        data: { metadata: { isRead: true } },
      });
    }

    if (normalizedType === 'SYSTEM_NOTIFICATION') {
      return await prisma.notification.update({
        where: { id, userId },
        data: { isRead: true },
      });
    }

    return { success: true };
  },
};

export default inboxService;
