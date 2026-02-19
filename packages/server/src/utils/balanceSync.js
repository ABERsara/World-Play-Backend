// packages/server/src/utils/balanceSync.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const syncUserBalances = async (io, userId, gameId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true },
    });

    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId } },
      select: { score: true },
    });

    // שידור ישיר לחדר הפרטי של המשתמש (userId)
    // ודאי שהקליינט הצטרף לחדר הזה ב-connection
    io.to(userId).emit('balance_update', {
      walletCoins: Number(user.walletBalance),
      pointsInGame: participant ? Number(participant.score) : 0,
      gameId: gameId,
    });

    console.log(
      `📡 [SYNC SENT] To User ${userId} | Balance: ${user.walletBalance}`
    );
  } catch (error) {
    console.error('[Sync Error]', error);
  }
};
