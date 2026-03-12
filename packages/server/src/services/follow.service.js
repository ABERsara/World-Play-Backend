// services/follow.service.js
import { PrismaClient } from '@prisma/client';
import * as gameRules from './validation.service.js';

const prisma = new PrismaClient();

const followService = {
  /**
   * יצירת מעקב חדש
   */
  async followUser(followerId, followingId) {
    // 1. בדיקה שזה לא אותו משתמש (אי אפשר לעקוב אחרי עצמי)
    if (followerId === followingId) {
      throw new Error('You cannot follow yourself');
    }

    // 2. ולידציה שהמשתמשים קיימים
    await Promise.all([
      gameRules.ensureUserExists(followerId),
      gameRules.ensureUserExists(followingId),
    ]);

    // 3. יצירת המעקב (שימוש ב-upsert כדי למנוע כפילויות אם המשתמש לוחץ פעמיים)
    const follow = await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      update: {}, // אם כבר קיים, אל תעשה כלום
      create: {
        followerId,
        followingId,
      },
    });

    return follow;
  },
  async getMyFollowers(userId) {
    // שליפת כל הרשומות שבהן אני ה-followingId
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            isActive: true, // כדי לדעת אם העוקב פעיל
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // החזרת רשימת המשתמשים בלבד בצורה נקייה
    return followers.map((f) => f.follower);
  },

  /**
   * הסרת מעקב (Unfollow)
   */
  async unfollowUser(followerId, followingId) {
    return await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });
  },
};

export default followService;
