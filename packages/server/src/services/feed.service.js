/**
 * feed.service.js
 *
 * שכבת השירות לבניית הפיד האישי של המשתמש.
 * בונה רשימת שידורים חיים מותאמת אישית מ-3 שכבות:
 *   1. שידורים של מארחים שהמשתמש עוקב אחריהם
 *   2. שידורים של מארחים שהמשתמש הראה בהם עניין (ViewLog)
 *   3. fallback — שידורים פופולריים כלשהם אם הפיד ריק
 *
 * מתקשר עם: Prisma → Follow, ViewLog, Stream
 * תלוי ב:   validation.service.js (קיום משתמש, חוקי התעניינות, מיזוג רשימות)
 * משמש את:  feed.controller.js
 */
import { PrismaClient } from '@prisma/client';
import * as gameRules from '../services/validation.service.js';

const prisma = new PrismaClient();

const feedService = {
  async fetchActiveStreams(userId) {
    await gameRules.ensureUserExists(userId);

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const interestRules = gameRules.getSignificantInteractionRules();

    const interestLogs = await prisma.viewLog.findMany({
      where: {
        userId: userId,
        hostId: { notIn: followingIds },
        OR: interestRules,
      },
      distinct: ['hostId'],
      take: 5,
      select: { hostId: true },
    });

    const recommendedHostIds = interestLogs.map((log) => log.hostId);

    const targetHostIds = gameRules.mergeUniqueIds(
      followingIds,
      recommendedHostIds
    );

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
