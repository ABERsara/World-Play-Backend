import { PrismaClient } from '@prisma/client';
import inboxService from './inbox.service.js'; // ודאי שהנתיב נכון

const prisma = new PrismaClient();

const followService = {
  /**
   * יצירת מעקב חדש עם עדכון מונים והתראה
   */
  async followUser(followerId, followingId) {
    if (followerId === followingId)
      throw new Error('אינך יכול לעקוב אחרי עצמך');

    return await prisma.$transaction(async (tx) => {
      // 1. בדיקה אם כבר קיים מעקב
      const existingFollow = await tx.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
      });

      if (existingFollow) return existingFollow;

      // 2. יצירת רשומת המעקב
      const follow = await tx.follow.create({
        data: { followerId, followingId },
        include: { follower: { select: { username: true } } },
      });

      // 3. עדכון מונים (Atomic Increment)
      await tx.user.update({
        where: { id: followingId },
        data: { followersCount: { increment: 1 } },
      });

      await tx.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      });

      // 4. יצירת התראה באינבוקס למשתמש שקיבל עוקב
      try {
        await inboxService.createNotification(followingId, {
          type: 'FOLLOW',
          title: 'עוקב חדש 👤',
          content: `${follow.follower.username} התחיל לעקוב אחריך`,
          metadata: { followerId },
        });
      } catch (err) {
        console.error('⚠️ שגיאה ביצירת התראה:', err.message);
      }

      return follow;
    });
  },

  /**
   * הסרת מעקב עם עדכון מונים
   */
  async unfollowUser(followerId, followingId) {
    return await prisma.$transaction(async (tx) => {
      const deleteResult = await tx.follow.deleteMany({
        where: { followerId, followingId },
      });

      if (deleteResult.count > 0) {
        await tx.user.update({
          where: { id: followingId },
          data: { followersCount: { decrement: 1 } },
        });

        await tx.user.update({
          where: { id: followerId },
          data: { followingCount: { decrement: 1 } },
        });
      }
      return deleteResult;
    });
  },

  async getMyFollowers(userId) {
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: { id: true, username: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return followers.map((f) => f.follower);
  },
};

export default followService;
