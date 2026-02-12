// src/services/economy.service.js

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const economyService = {
  // --- פרק 3: מערכת המתנות (עודכן לדיוק עשרוני 65/35) ---
  async sendGift(senderId, receiverPlayerId, moderatorId, giftValue, gameId) {
    return await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({ where: { id: senderId } });
      if (!sender) throw new Error(`Sender not found`);

      // המרה ל-Decimal
      const giftDecimal = new Prisma.Decimal(giftValue.toString());

      // שימוש ב-Decimal להשוואה
      if (sender.walletBalance.lt(giftDecimal))
        throw new Error('Insufficient balance');

      // חישוב עשרוני מדויק (35% למקבל, השאר למנחה)
      const receiverShare = giftDecimal.mul(0.35).toFixed(2);
      const hostShare = giftDecimal.minus(receiverShare).toFixed(2);

      await tx.user.update({
        where: { id: senderId },
        data: { walletBalance: { decrement: giftDecimal.toFixed(2) } },
      });

      await tx.user.update({
        where: { id: receiverPlayerId },
        data: { walletBalance: { increment: receiverShare } },
      });

      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: hostShare } },
      });

      await tx.transaction.create({
        data: {
          userId: senderId,
          type: 'GIFT',
          amount: giftDecimal.toFixed(2),
          gameId,
          description: `Gift: ${receiverShare} to player, ${hostShare} to host`,
          status: 'SUCCESS',
        },
      });

      return { receiverShare, hostShare };
    });
  },

  // --- פרק 3: מי ינצח (עודכן לדיוק עשרוני 85/15) ---
  async processWinnerPayout(questionId, correctOptionId, moderatorId, gameId) {
    return await prisma.$transaction(async (tx) => {
      const option = await tx.questionOption.findUnique({
        where: { id: correctOptionId },
      });
      if (!option?.linkedPlayerId) return null;

      const totalWagers = await tx.userAnswer.aggregate({
        where: { questionId },
        _sum: { wager: true },
      });

      const totalPot = totalWagers._sum.wager || new Prisma.Decimal(0);
      if (totalPot.equals(0)) return { totalPot: '0.00' };

      // חלוקה עשרונית מדויקת
      const playerShare = totalPot.mul(0.85).toFixed(2);
      const moderatorShare = totalPot.minus(playerShare).toFixed(2);

      await tx.user.update({
        where: { id: option.linkedPlayerId },
        data: { walletBalance: { increment: playerShare } },
      });

      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: moderatorShare } },
      });

      await tx.transaction.create({
        data: {
          userId: option.linkedPlayerId,
          type: 'WINNER_PAYOUT',
          amount: playerShare,
          gameId,
          status: 'SUCCESS',
        },
      });

      return { totalPot: totalPot.toFixed(2), playerShare, moderatorShare };
    });
  },

  // --- פרק 2: חלוקת קופה רגילה (שיטת היחידות) ---
  async processStandardPotDistribution(questionId, gameId, moderatorId) {
    return await prisma.$transaction(async (tx) => {
      const totalWagers = await tx.userAnswer.aggregate({
        where: { questionId, option: { isCorrect: false } },
        _sum: { wager: true },
      });

      const totalPot = totalWagers._sum.wager || new Prisma.Decimal(0);
      if (totalPot.lte(0)) return { success: true };

      const players = await tx.gameParticipant.findMany({
        where: { gameId, role: 'PLAYER' },
      });

      if (players.length === 0) {
        // אם אין שחקנים, המנחה לוקח הכל
        await tx.user.update({
          where: { id: moderatorId },
          data: { walletBalance: { increment: totalPot.toFixed(2) } },
        });
        return {
          totalPot: totalPot.toFixed(2),
          hostShare: totalPot.toFixed(2),
        };
      }

      const totalUnits = players.length * 1.0 + 1.15;
      const baseShare = totalPot.div(totalUnits).toFixed(2);

      for (const player of players) {
        await tx.user.update({
          where: { id: player.userId },
          data: { walletBalance: { increment: baseShare } },
        });
        await tx.gameParticipant.update({
          where: { id: player.id },
          data: { score: { increment: baseShare } },
        });
      }

      const totalGivenToPlayers = new Prisma.Decimal(baseShare).mul(
        players.length
      );
      const hostShare = totalPot.minus(totalGivenToPlayers).toFixed(2);

      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: hostShare } },
      });

      return { totalPot: totalPot.toFixed(2), baseShare, hostShare };
    });
  },

  // --- פרק 3: בונוס 125% לצופים ---
  async payoutCorrectViewers(questionId, correctOptionId, gameId) {
    const correctAnswers = await prisma.userAnswer.findMany({
      where: { questionId, selectedOptionId: correctOptionId },
    });

    for (const answer of correctAnswers) {
      const reward = answer.wager.mul(1.25).toFixed(2);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: answer.userId },
          data: { walletBalance: { increment: reward } },
        }),
        prisma.transaction.create({
          data: {
            userId: answer.userId,
            type: 'EARN',
            amount: reward,
            gameId,
            status: 'SUCCESS',
          },
        }),
      ]);
    }
  },
};

export default economyService;
