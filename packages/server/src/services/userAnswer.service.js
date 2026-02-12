// packages/server/src/services/userAnswer.service.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const userAnswerService = {
  async submitAnswer(userId, { questionId, selectedOptionId, wager = 0 }) {
    return await prisma.$transaction(async (tx) => {
      const question = await tx.question.findUnique({
        where: { id: questionId },
        include: { game: true },
      });

      if (!question) throw new Error('Question not found');
      if (question.isResolved) throw new Error('Question is already closed');
      if (question.game.status !== 'ACTIVE')
        throw new Error('Game is not active');

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const wagerNum = parseFloat(wager);
      if (isNaN(wagerNum) || wagerNum < 0) throw new Error('Invalid wager');

      if (user.walletBalance < wagerNum)
        throw new Error('Insufficient balance');

      // עדכון הארנק
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: user.walletBalance - wagerNum },
      });

      const existing = await tx.userAnswer.findUnique({
        where: { userId_questionId: { userId, questionId } },
      });

      if (existing) {
        return await tx.userAnswer.update({
          where: { id: existing.id },
          data: { selectedOptionId, wager: wagerNum },
        });
      }

      return await tx.userAnswer.create({
        data: { userId, questionId, selectedOptionId, wager: wagerNum },
      });
    });
  },
};

export default userAnswerService;
