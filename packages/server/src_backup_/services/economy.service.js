// src/services/economy.service.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const economyService = {
  _calculateShares(totalAmount, playerPercentage) {
    const playerShare = Math.floor(totalAmount * playerPercentage);
    const moderatorShare = totalAmount - playerShare;
    return { playerShare, moderatorShare };
  },

  async sendGift(senderId, receiverPlayerId, moderatorId, giftValue, gameId) {
    return await prisma.$transaction(async (tx) => {
      // --- שלב 1: בדיקות קיום (כדי למנוע את השגיאה שקיבלת) ---

      // בדיקת שולח
      const sender = await tx.user.findUnique({ where: { id: senderId } });
      if (!sender) throw new Error(`Sender (ID: ${senderId}) not found`);
      if (Number(sender.walletBalance) < giftValue)
        throw new Error('Insufficient balance');

      // בדיקת מקבל
      const receiver = await tx.user.findUnique({
        where: { id: receiverPlayerId },
      });
      if (!receiver)
        throw new Error(`Receiver (ID: ${receiverPlayerId}) not found`);

      // בדיקת השתתפות במשחק (הסיבה הכי נפוצה לשגיאה שלך)
      const participant = await tx.gameParticipant.findUnique({
        where: { gameId_userId: { gameId, userId: receiverPlayerId } },
      });
      if (!participant)
        throw new Error(
          `Receiver is not a participant in game: ${gameId}. Run 'Join Game' first.`
        );

      // --- שלב 2: החישוב ---
      const { playerShare, moderatorShare } = this._calculateShares(
        giftValue,
        0.35
      );

      // --- שלב 3: העדכונים ---

      // ניכוי מהשולח
      await tx.user.update({
        where: { id: senderId },
        data: { walletBalance: { decrement: giftValue } },
      });

      // זיכוי למקבל
      await tx.user.update({
        where: { id: receiverPlayerId },
        data: { walletBalance: { increment: playerShare } },
      });

      // זיכוי למנחה
      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: moderatorShare } },
      });

      // עדכון ניקוד בתוך המשחק
      await tx.gameParticipant.update({
        where: { gameId_userId: { gameId, userId: receiverPlayerId } },
        data: { score: { increment: playerShare } },
      });

      // תיעוד
      await tx.transaction.create({
        data: {
          userId: senderId,
          type: 'GIFT',
          amount: giftValue,
          gameId,
          description: `Gift to ${receiverPlayerId}`,
          status: 'SUCCESS',
        },
      });

      return { playerShare, moderatorShare };
    });
  },
  async processWinnerPayout(questionId, correctOptionId, moderatorId, gameId) {
    return await prisma.$transaction(async (tx) => {
      // 1. מציאת השחקן שצמוד לאופציה הנכונה
      const option = await tx.questionOption.findUnique({
        where: { id: correctOptionId },
      });

      if (!option?.linkedPlayerId) return null;

      // 2. איסוף הקופה (משימה 2)
      const totalWagers = await tx.userAnswer.aggregate({
        where: { questionId: questionId },
        _sum: { wager: true },
      });

      const totalPot = totalWagers._sum.wager || 0;
      if (totalPot === 0) return { totalPot: 0 };

      // 3. חלוקה 85/15 עם לוגיקת השארית (משימה 3)
      const playerShare = Math.floor(totalPot * 0.85);
      const moderatorShare = totalPot - playerShare; // השארית עוברת אוטומטית למנחה

      // 4. עדכון יתרות בבנק (משימה 5)
      await tx.user.update({
        where: { id: option.linkedPlayerId },
        data: { walletBalance: { increment: playerShare } },
      });

      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: moderatorShare } },
      });

      // 5. תיעוד בטבלת Transactions (משימה 3 מהאפיון)
      await tx.transaction.create({
        data: {
          userId: option.linkedPlayerId,
          type: 'WINNER_PAYOUT',
          amount: playerShare,
          gameId,
          description: `Winner payout from question ${questionId}`,
          status: 'SUCCESS',
        },
      });

      return { totalPot, playerShare, moderatorShare };
    });
  },
};

export default economyService;
