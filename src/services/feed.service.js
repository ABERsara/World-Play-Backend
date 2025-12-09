import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const fetchActiveStreams = async (userId) => {
  // שלב א: מזהים אחרי מי המשתמש עוקב
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  // שלב ב: מזהים מארחים שמעניינים את המשתמש (לפי היסטוריית צפייה) אבל הוא לא עוקב אחריהם
  const interestLogs = await prisma.viewLog.findMany({
    where: {
      userId: userId,
      hostId: { notIn: followingIds }, // לא כולל את מי שכבר עוקבים אחריו
      OR: [
        { duration: { gt: 60 } }, // תנאי: צפה מעל דקה
        { participationPercent: { gt: 0.2 } }, // תנאי: או השתתף מעל 20%
      ],
    },
    distinct: ['hostId'],
    take: 5, // ניקח 5 המלצות
    select: { hostId: true },
  });

  const recommendedHostIds = interestLogs.map((log) => log.hostId);

  // שלב ג: מחברים את שתי הרשימות
  const targetHostIds = [...new Set([...followingIds, ...recommendedHostIds])];

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
};
