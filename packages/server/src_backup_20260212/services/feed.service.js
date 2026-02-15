import { PrismaClient } from '@prisma/client';
import * as gameRules from '../services/validation.service.js'; // ודאי שהקובץ הזה קיים בתיקיית services

const prisma = new PrismaClient();

const feedService = {
  // 2. עוטפים באובייקט כדי לשמור על אחידות

  async fetchActiveStreams(userId) {
    // שלב מקדים: מוודאים שהמשתמש קיים בכלל (מונע קריסות)
    await gameRules.ensureUserExists(userId);

    // שלב א: מזהים אחרי מי המשתמש עוקב
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    // שלב ב: מזהים מארחים שמעניינים את המשתמש
    // שינוי: לוקחים את החוקים (60 שניות / 20%) מתוך ה-Validation Service
    const interestRules = gameRules.getSignificantInteractionRules();

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
    const targetHostIds = gameRules.mergeUniqueIds(
      followingIds,
      recommendedHostIds
    );

    // שלב ד: שולפים רק את השידורים של האנשים ברשימה
    const liveStreams = await prisma.stream.findMany({
      where: {
        status: 'LIVE',
        hostId: { in: targetHostIds }, // <--- הסינון החשוב
      },
      include: {
        host: true,
        games: true,
      },
      orderBy: { startTime: 'desc' },
    });

    // (אופציונלי) אם הרשימה ריקה, אפשר להחזיר סתם שידורים פופולריים כדי שהפיד לא יהיה ריק
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
