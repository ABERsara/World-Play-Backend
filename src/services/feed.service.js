import { PrismaClient } from '@prisma/client';
import validationService from './validation.service.js'; // 1. מייבאים את ה-Validation המתוקן

const prisma = new PrismaClient();

const feedService = {
  // 2. עוטפים באובייקט כדי לשמור על אחידות

  async fetchActiveStreams(userId) {
    // שלב מקדים: מוודאים שהמשתמש קיים בכלל (מונע קריסות)
    await validationService.ensureUserExists(userId);

    // שלב א: מזהים אחרי מי המשתמש עוקב
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // שלב ב: מזהים מארחים שמעניינים את המשתמש
    // שינוי: לוקחים את החוקים (60 שניות / 20%) מתוך ה-Validation Service
    const interestRules = validationService.getSignificantInteractionRules();

    const interestLogs = await prisma.viewLog.findMany({
      where: {
        userId: userId,
        hostId: { notIn: followingIds }, // לא כולל את מי שכבר עוקבים אחריו
        OR: interestRules, // <--- שימוש בחוקים המרכזיים
      },
      distinct: ['hostId'],
      take: 5,
      select: { hostId: true },
    });

    const recommendedHostIds = interestLogs.map((log) => log.hostId);

    // שלב ג: מחברים את שתי הרשימות ומוחקים כפילויות
    // שינוי: שימוש בפונקציית העזר החדשה שיצרנו
    const targetHostIds = validationService.mergeUniqueIds(
      followingIds,
      recommendedHostIds
    );

    // שלב ד: שולפים את השידורים (נשאר אותו דבר)
    const liveStreams = await prisma.stream.findMany({
      where: {
        status: 'LIVE',
        hostId: { in: targetHostIds },
      },
      include: {
        host: true,
        games: true,
      },
      orderBy: { startTime: 'desc' },
    });

    // (אופציונלי) פולבאק לשידורים פופולריים אם הכל ריק
    if (liveStreams.length === 0) {
      return await prisma.stream.findMany({
        where: { status: 'LIVE' },
        take: 10,
        include: { host: true, games: true },
      });
    }

    return liveStreams;
  },
};

export default feedService;
