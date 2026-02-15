// src/services/economy.service.js
// ✅ מנוע כלכלי מלא עם תמיכה בדיוק עשרוני (2 ספרות אחרי הנקודה)

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const economyService = {
  // ========================================
  // 1. פונקציות עזר פנימיות
  // ========================================

  /**
   * חישוב חלוקה פשוטה בין שני צדדים
   * @private
   */
  _calculateShares(totalAmount, percentage) {
    const primaryShare = totalAmount * percentage;
    const secondaryShare = totalAmount - primaryShare;
    return { primaryShare, secondaryShare };
  },

  /**
   * המרת Decimal ל-Number (Prisma מחזיר Decimal objects)
   * @private
   */
  _toNumber(value) {
    return value ? Number(value) : 0;
  },

  // ========================================
  // 2. חלוקת קופה רגילה (Standard Question)
  // ========================================

  /**
   * מחלקת את הקופה בין שחקנים פעילים ומנחה
   * נוסחה: כל שחקן = 1.0 יחידה, מנחה = 1.15 יחידות
   *
   * @param {string} questionId - מזהה השאלה
   * @param {string} gameId - מזהה המשחק
   * @param {string} moderatorId - מזהה המנחה
   * @returns {Promise<Object>} תוצאות החלוקה
   */
  async distributeStandardPot(questionId, gameId, moderatorId) {
    return await prisma.$transaction(async (tx) => {
      // שלב 1: איסוף הקופה
      const totalWagersResult = await tx.userAnswer.aggregate({
        where: { questionId: questionId },
        _sum: { wager: true },
      });

      const totalPot = this._toNumber(totalWagersResult._sum.wager);

      // תנאי עצירה: אין קופה
      if (totalPot === 0) {
        console.log(
          `[ECONOMY] No pot to distribute for question ${questionId}`
        );
        return {
          totalPot: 0,
          distributions: [],
          message: 'No wagers placed',
        };
      }

      // שלב 2: זיהוי שחקנים פעילים
      const activeAnswers = await tx.userAnswer.findMany({
        where: { questionId: questionId },
        select: { userId: true },
        distinct: ['userId'],
      });

      const activePlayerIds = activeAnswers.map((a) => a.userId);
      const numPlayers = activePlayerIds.length;

      // תנאי קיצון: אין שחקנים, כל הקופה למנחה
      if (numPlayers === 0) {
        console.log(`[ECONOMY] No active players - full pot to moderator`);

        await tx.user.update({
          where: { id: moderatorId },
          data: { walletBalance: { increment: totalPot } },
        });

        await tx.transaction.create({
          data: {
            userId: moderatorId,
            type: 'BONUS',
            amount: totalPot,
            gameId,
            currency: 'COIN',
            description: `Full pot (no active players) - Q: ${questionId}`,
            status: 'SUCCESS',
          },
        });

        return {
          totalPot,
          numPlayers: 0,
          distributions: [
            { userId: moderatorId, amount: totalPot, role: 'HOST' },
          ],
        };
      }

      // שלב 3: חישוב החלוקה הפרופורציונלית
      const totalUnits = numPlayers * 1.0 + 1.15;
      const baseShare = totalPot / totalUnits;

      console.log(
        `[ECONOMY] Distributing ${totalPot} coins among ${numPlayers} players + host`
      );
      console.log(`[ECONOMY] Base share per player: ${baseShare.toFixed(2)}`);

      // שלב 4: זיכוי השחקנים
      const playerDistributions = [];

      for (const playerId of activePlayerIds) {
        // עדכון ארנק
        await tx.user.update({
          where: { id: playerId },
          data: { walletBalance: { increment: baseShare } },
        });

        // עדכון ציון במשחק
        await tx.gameParticipant.updateMany({
          where: {
            gameId: gameId,
            userId: playerId,
          },
          data: { score: { increment: baseShare } },
        });

        // תיעוד טרנזקציה
        await tx.transaction.create({
          data: {
            userId: playerId,
            type: 'GAME',
            amount: baseShare,
            gameId,
            currency: 'COIN',
            description: `Pot share - Q: ${questionId}`,
            status: 'SUCCESS',
          },
        });

        playerDistributions.push({
          userId: playerId,
          amount: parseFloat(baseShare.toFixed(2)),
          role: 'PLAYER',
        });
      }

      // שלב 5: חישוב נתח המנחה (השארית המדויקת)
      const totalGivenToPlayers = baseShare * numPlayers;
      const hostShare = totalPot - totalGivenToPlayers;

      console.log(`[ECONOMY] Host share (remainder): ${hostShare.toFixed(2)}`);

      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: hostShare } },
      });

      await tx.transaction.create({
        data: {
          userId: moderatorId,
          type: 'GAME',
          amount: hostShare,
          gameId,
          currency: 'COIN',
          description: `Host share (${((1.15 / totalUnits) * 100).toFixed(1)}%) - Q: ${questionId}`,
          status: 'SUCCESS',
        },
      });

      // שלב 6: החזרת סיכום
      return {
        totalPot: parseFloat(totalPot.toFixed(2)),
        numPlayers,
        baseShare: parseFloat(baseShare.toFixed(2)),
        hostShare: parseFloat(hostShare.toFixed(2)),
        distributions: [
          ...playerDistributions,
          {
            userId: moderatorId,
            amount: parseFloat(hostShare.toFixed(2)),
            role: 'HOST',
          },
        ],
      };
    });
  },

  // ========================================
  // 3. שאלת "מי ינצח" (Winner Takes All)
  // ========================================

  /**
   * חלוקת הקופה במקרה של שאלת "מי ינצח"
   * 85% לשחקן המנצח, 15% למנחה
   *
   * @param {string} questionId - מזהה השאלה
   * @param {string} correctOptionId - מזהה האופציה הנכונה
   * @param {string} moderatorId - מזהה המנחה
   * @param {string} gameId - מזהה המשחק
   * @returns {Promise<Object>} תוצאות התשלום
   */
  async processWinnerPayout(questionId, correctOptionId, moderatorId, gameId) {
    return await prisma.$transaction(async (tx) => {
      // שלב 1: מציאת השחקן המנצח (מקושר לאופציה הנכונה)
      const correctOption = await tx.questionOption.findUnique({
        where: { id: correctOptionId },
      });

      if (!correctOption?.linkedPlayerId) {
        console.log(
          `[ECONOMY] No linked player for winner option ${correctOptionId}`
        );
        return {
          totalPot: 0,
          message: 'No winner linked to this option',
        };
      }

      const winnerId = correctOption.linkedPlayerId;

      // שלב 2: איסוף הקופה
      const totalWagersResult = await tx.userAnswer.aggregate({
        where: { questionId: questionId },
        _sum: { wager: true },
      });

      const totalPot = this._toNumber(totalWagersResult._sum.wager);

      if (totalPot === 0) {
        console.log(`[ECONOMY] No pot for winner question ${questionId}`);
        return { totalPot: 0, winnerId };
      }

      // שלב 3: חישוב חלוקה 85/15
      const winnerShare = totalPot * 0.85;
      const hostShare = totalPot - winnerShare; // השארית למנחה

      console.log(
        `[ECONOMY] Winner ${winnerId} gets ${winnerShare.toFixed(2)} (85%)`
      );
      console.log(
        `[ECONOMY] Host ${moderatorId} gets ${hostShare.toFixed(2)} (15%)`
      );

      // שלב 4: זיכוי המנצח
      await tx.user.update({
        where: { id: winnerId },
        data: { walletBalance: { increment: winnerShare } },
      });

      await tx.gameParticipant.updateMany({
        where: {
          gameId: gameId,
          userId: winnerId,
        },
        data: { score: { increment: winnerShare } },
      });

      await tx.transaction.create({
        data: {
          userId: winnerId,
          type: 'WINNER_PAYOUT',
          amount: winnerShare,
          gameId,
          currency: 'COIN',
          description: `Winner prize (85%) - Q: ${questionId}`,
          status: 'SUCCESS',
        },
      });

      // שלב 5: זיכוי המנחה
      await tx.user.update({
        where: { id: moderatorId },
        data: { walletBalance: { increment: hostShare } },
      });

      await tx.transaction.create({
        data: {
          userId: moderatorId,
          type: 'WINNER_PAYOUT',
          amount: hostShare,
          gameId,
          currency: 'COIN',
          description: `Host commission (15%) - Q: ${questionId}`,
          status: 'SUCCESS',
        },
      });

      // שלב 6: החזרת סיכום
      return {
        totalPot: parseFloat(totalPot.toFixed(2)),
        winnerId,
        winnerShare: parseFloat(winnerShare.toFixed(2)),
        hostShare: parseFloat(hostShare.toFixed(2)),
        distributions: [
          {
            userId: winnerId,
            amount: parseFloat(winnerShare.toFixed(2)),
            role: 'WINNER',
          },
          {
            userId: moderatorId,
            amount: parseFloat(hostShare.toFixed(2)),
            role: 'HOST',
          },
        ],
      };
    });
  },

  // ========================================
  // 4. בונוס תשובה נכונה (125%)
  // ========================================

  /**
   * זיכוי אוטומטי לצופה שענה נכון
   * מקבל 125% מההימור שלו (החזר + 25% רווח)
   *
   * @param {string} userId - מזהה המשתמש
   * @param {string} questionId - מזהה השאלה
   * @param {string} gameId - מזהה המשחק
   * @returns {Promise<Object>} פרטי הזיכוי
   */
  async rewardCorrectAnswer(userId, questionId, gameId) {
    return await prisma.$transaction(async (tx) => {
      const userAnswer = await tx.userAnswer.findUnique({
        where: { userId_questionId: { userId, questionId } },
      });

      if (!userAnswer) return { rewarded: false, reason: 'No answer found' };

      const wager = this._toNumber(userAnswer.wager);
      if (wager === 0) return { rewarded: false, reason: 'No wager placed' };

      const reward = wager * 1.25;

      // זיכוי ארנק המשתמש
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: reward } },
      });

      // יצירת טרנזקציה עם סוג חוקי (EARN) ודיוק עשרוני (.toFixed)
      await tx.transaction.create({
        data: {
          userId,
          type: 'EARN', // תואם ל-Enum הקיים בסכימה
          amount: reward.toFixed(2), // פותר את שגיאת ה-Binary Format
          gameId,
          currency: 'COIN',
          description: `Correct answer bonus (125% of ${wager.toFixed(2)}) - Q: ${questionId}`,
          status: 'SUCCESS',
        },
      });

      return {
        rewarded: true,
        originalWager: parseFloat(wager.toFixed(2)),
        reward: parseFloat(reward.toFixed(2)),
      };
    });
  },

  // ========================================
  // 5. מערכת מתנות (Gifts)
  // ========================================

  /**
   * שליחת מתנה משולח למקבל
   * חלוקה: 65% למנחה, 35% למקבל
   *
   * @param {string} senderId - מזהה השולח
   * @param {string} receiverPlayerId - מזהה המקבל
   * @param {string} moderatorId - מזהה המנחה
   * @param {number} giftValue - ערך המתנה
   * @param {string} gameId - מזהה המשחק
   * @returns {Promise<Object>} פרטי החלוקה
   */
  async sendGift(senderId, receiverPlayerId, moderatorId, giftValue, gameId) {
    return await prisma.$transaction(async (tx) => {
      // בדיקות קיום ויתרה
      const sender = await tx.user.findUnique({
        where: { id: senderId },
        select: { id: true, walletBalance: true },
      });

      if (!sender) {
        throw new Error(`Sender (ID: ${senderId}) not found`);
      }

      const senderBalance = this._toNumber(sender.walletBalance);

      if (senderBalance < giftValue) {
        throw new Error(
          `Insufficient balance. You have ${senderBalance.toFixed(2)}, need ${giftValue.toFixed(2)}`
        );
      }

      // בדיקת מקבל
      const receiver = await tx.user.findUnique({
        where: { id: receiverPlayerId },
        select: { id: true },
      });

      if (!receiver) {
        throw new Error(`Receiver (ID: ${receiverPlayerId}) not found`);
      }

      // בדיקת השתתפות במשחק
      const participant = await tx.gameParticipant.findUnique({
        where: { gameId_userId: { gameId, userId: receiverPlayerId } },
      });

      if (!participant) {
        throw new Error(
          `Receiver must be an active participant in game ${gameId}. Use 'Join Game' first.`
        );
      }

      // חישוב חלוקה: 65% מנחה, 35% מקבל
      const hostShare = giftValue * 0.65;
      const playerShare = giftValue * 0.35;

      console.log(
        `[ECONOMY] Gift: ${senderId} → ${receiverPlayerId} (${giftValue})`
      );
      console.log(
        `[ECONOMY] Split: Player ${playerShare.toFixed(2)} | Host ${hostShare.toFixed(2)}`
      );

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
        data: { walletBalance: { increment: hostShare } },
      });

      // עדכון ניקוד במשחק (רק למקבל)
      await tx.gameParticipant.update({
        where: { gameId_userId: { gameId, userId: receiverPlayerId } },
        data: { score: { increment: playerShare } },
      });

      // תיעוד טרנזקציות (3 רשומות)
      await tx.transaction.createMany({
        data: [
          {
            userId: senderId,
            type: 'GIFT',
            amount: -giftValue, // ערך שלילי = ניכוי
            gameId,
            currency: 'COIN',
            description: `Gift sent to ${receiverPlayerId}`,
            status: 'SUCCESS',
          },
          {
            userId: receiverPlayerId,
            type: 'GIFT',
            amount: playerShare,
            gameId,
            currency: 'COIN',
            description: `Gift received (35% of ${giftValue.toFixed(2)})`,
            status: 'SUCCESS',
          },
          {
            userId: moderatorId,
            type: 'GIFT',
            amount: hostShare,
            gameId,
            currency: 'COIN',
            description: `Gift commission (65% of ${giftValue.toFixed(2)})`,
            status: 'SUCCESS',
          },
        ],
      });

      return {
        playerShare: parseFloat(playerShare.toFixed(2)),
        hostShare: parseFloat(hostShare.toFixed(2)),
        totalGift: parseFloat(giftValue.toFixed(2)),
        breakdown: {
          sender: senderId,
          receiver: receiverPlayerId,
          host: moderatorId,
        },
      };
    });
  },
};

export default economyService;
