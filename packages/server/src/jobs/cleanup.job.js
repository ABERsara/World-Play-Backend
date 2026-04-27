// Job יומי (חצות) — מחיקה לוגית אחרי 30 יום ומחיקה פיזית אחרי 31 יום למשחקים ללא pinned
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function startCleanupJob() {
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] מתחיל ניקוי יומי...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    // שלב 1 – מחיקה לוגית: isDeleted = true אחרי 30 יום
    const logicalDelete = await prisma.userGameActivity.updateMany({
      where: {
        isPinned: false,
        isDeleted: false,
        game: { finishedAt: { lt: thirtyDaysAgo } },
      },
      data: { isDeleted: true },
    });
    console.log(`[Cron] סומנו כמחוקים לוגית: ${logicalDelete.count}`);

    // שלב 2 – מחיקה פיזית: משחקים מעל 31 יום ללא אף pinned
    const gamesToDelete = await prisma.game.findMany({
      where: {
        finishedAt: { lt: thirtyOneDaysAgo },
        gameActivities: { none: { isPinned: true } },
      },
      select: { id: true },
    });

    const gameIds = gamesToDelete.map((g) => g.id);

    if (gameIds.length > 0) {
      await prisma.userAnswer.deleteMany({
        where: { question: { gameId: { in: gameIds } } },
      });
      await prisma.questionOption.deleteMany({
        where: { question: { gameId: { in: gameIds } } },
      });
      await prisma.question.deleteMany({ where: { gameId: { in: gameIds } } });
      await prisma.userPoint.deleteMany({ where: { gameId: { in: gameIds } } });
      await prisma.viewLog.deleteMany({ where: { gameId: { in: gameIds } } });
      await prisma.gameParticipant.deleteMany({
        where: { gameId: { in: gameIds } },
      });
      await prisma.userGameActivity.deleteMany({
        where: { gameId: { in: gameIds } },
      });
      await prisma.game.deleteMany({ where: { id: { in: gameIds } } });

      console.log(`[Cron] נמחקו פיזית: ${gameIds.length} משחקים`);
    }
  });
}
