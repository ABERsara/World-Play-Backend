// src/services/economy.service.js
// ✅ תיקון: שימוש ב-upsert במקום update ל-gameParticipant (מונע שגיאת "Record not found")

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const economyService = {
  /**
   * המרת Decimal ל-Number
   * @private
   */
  _toNumber(value) {
    return value ? Number(value) : 0;
  },

  // ========================================
  // 1. חלוקת קופה רגילה (Standard Question)
  // ========================================

  async distributeStandardPot(questionId, gameId, moderatorId) {
    return await prisma.$transaction(async (tx) => {
      const totalWagersResult = await tx.userAnswer.aggregate({
        where: { questionId },
        _sum: { wager: true },
      });

      const totalPot = this._toNumber(totalWagersResult._sum.wager);
      if (totalPot === 0) return { totalPot: 0, distributions: [] };

      const activeAnswers = await tx.userAnswer.findMany({
        where: { questionId },
        select: { userId: true },
        distinct: ['userId'],
      });

      const activePlayerIds = activeAnswers.map((a) => a.userId);
      const numPlayers = activePlayerIds.length;

      if (numPlayers === 0) {
        await tx.user.update({
          where: { id: moderatorId },
          data: { walletBalance: { increment: totalPot } },
        });
        return {
          totalPot,
          distributions: [
            { userId: moderatorId, amount: totalPot, role: 'HOST' },
          ],
        };
      }

      const totalUnits = numPlayers * 1.0 + 1.15;
      const baseShare = Math.floor(totalPot / totalUnits);

      const playerDistributions = [];
      for (const playerId of activePlayerIds) {
        await tx.user.update({
          where: { id: playerId },
          data: { walletBalance: { increment: baseShare } },
        });

        await tx.gameParticipant.upsert({
          where: { gameId_userId: { gameId, userId: playerId } },
          update: { score: { increment: baseShare } },
          create: {
            gameId,
            userId: playerId,
            score: baseShare,
            role: 'VIEWER',
          },
        });

        playerDistributions.push({
          userId: playerId,
          amount: baseShare,
          role: 'PLAYER',
        });
      }

      const totalGivenToPlayers = baseShare * numPlayers;
      const hostShare = totalPot - totalGivenToPlayers;

      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: hostShare } },
      });

      return {
        totalPot,
        baseShare,
        hostShare,
        distributions: [
          ...playerDistributions,
          { userId: moderatorId, amount: hostShare, role: 'HOST' },
        ],
      };
    });
  },

  // ========================================
  // 2. שאלת "מי ינצח" (Winner Payout)
  // ========================================

  async processWinnerPayout(questionId, correctOptionId, moderatorId, gameId) {
    return await prisma.$transaction(async (tx) => {
      const correctOption = await tx.questionOption.findUnique({
        where: { id: correctOptionId },
      });

      if (!correctOption?.linkedPlayerId) throw new Error('No winner linked');
      const winnerId = correctOption.linkedPlayerId;

      const totalWagersResult = await tx.userAnswer.aggregate({
        where: { questionId },
        _sum: { wager: true },
      });

      const totalPot = this._toNumber(totalWagersResult._sum.wager);
      if (totalPot === 0) return { totalPot: 0, winnerId };

      const winnerShare = Math.floor(totalPot * 0.85);
      const hostShare = totalPot - winnerShare;

      await tx.user.update({
        where: { id: winnerId },
        data: { walletBalance: { increment: winnerShare } },
      });

      await tx.gameParticipant.upsert({
        where: { gameId_userId: { gameId, userId: winnerId } },
        update: { score: { increment: winnerShare } },
        create: {
          gameId,
          userId: winnerId,
          score: winnerShare,
          role: 'VIEWER',
        },
      });

      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: hostShare } },
      });

      await tx.transaction.createMany({
        data: [
          {
            userId: winnerId,
            type: 'DIRECT_WIN',
            amount: winnerShare,
            gameId,
            currency: 'COIN',
            status: 'SUCCESS',
          },
          {
            userId: moderatorId,
            type: 'DIRECT_WIN',
            amount: hostShare,
            gameId,
            currency: 'COIN',
            status: 'SUCCESS',
          },
        ],
      });

      return { totalPot, winnerId, winnerShare, hostShare };
    });
  },

  // ========================================
  // 3. זיכוי תשובה נכונה - STANDARD בלבד
  //    מי שענה נכון מקבל 125% מההימור שלו
  // ========================================

  async rewardCorrectAnswer(userId, questionId, gameId) {
    return await prisma.$transaction(async (tx) => {
      // מצא את ההימור של המשתמש על שאלה זו
      const answer = await tx.userAnswer.findFirst({
        where: { userId, questionId },
      });

      if (!answer) return { rewarded: false };

      // 125% מההימור המקורי
      const reward = Math.floor(this._toNumber(answer.wager) * 1.25);

      // זיכוי הארנק
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: reward } },
      });

      // עדכון ניקוד במשחק
      await tx.gameParticipant.upsert({
        where: { gameId_userId: { gameId, userId } },
        update: { score: { increment: reward } },
        create: {
          gameId,
          userId,
          score: reward,
          role: 'VIEWER',
        },
      });

      // תיעוד בטבלת Transactions
      await tx.transaction.create({
        data: {
          userId,
          type: 'CORRECT_ANSWER',
          amount: reward,
          gameId,
          currency: 'COIN',
          status: 'SUCCESS',
        },
      });

      return {
        rewarded: true,
        reward,
        originalWager: this._toNumber(answer.wager),
      };
    });
  },

  // ========================================
  // 4. מערכת מתנות (Gifts)
  // ========================================

  async sendGift(senderId, receiverPlayerId, moderatorId, giftValue, gameId) {
    return await prisma.$transaction(async (tx) => {
      const game = await tx.game.findUnique({ where: { id: gameId } });
      if (!game) throw new Error(`Game not found: ${gameId}`);

      const sender = await tx.user.findUnique({ where: { id: senderId } });
      const senderBalance = this._toNumber(sender?.walletBalance);

      if (senderBalance < giftValue) throw new Error('Insufficient Coins');

      await tx.user.update({
        where: { id: senderId },
        data: { walletBalance: { decrement: giftValue } },
      });

      const playerShare = Math.floor(giftValue * 0.35);
      const hostShare = giftValue - playerShare;

      await tx.user.update({
        where: { id: receiverPlayerId },
        data: { walletBalance: { increment: playerShare } },
      });

      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: hostShare } },
      });

      await tx.gameParticipant.upsert({
        where: { gameId_userId: { gameId, userId: receiverPlayerId } },
        update: { score: { increment: playerShare } },
        create: {
          gameId,
          userId: receiverPlayerId,
          score: playerShare,
          role: 'VIEWER',
        },
      });

      await tx.transaction.createMany({
        data: [
          {
            userId: senderId,
            type: 'GIFT',
            amount: -giftValue,
            gameId,
            currency: 'COIN',
            status: 'SUCCESS',
          },
          {
            userId: receiverPlayerId,
            type: 'GIFT',
            amount: playerShare,
            gameId,
            currency: 'COIN',
            status: 'SUCCESS',
          },
          {
            userId: moderatorId,
            type: 'GIFT',
            amount: hostShare,
            gameId,
            currency: 'COIN',
            status: 'SUCCESS',
          },
        ],
      });

      return { giftValue, playerShare, hostShare };
    });
  },
};

export default economyService;
