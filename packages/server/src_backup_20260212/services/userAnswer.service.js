import { PrismaClient } from '@prisma/client';
// מחקנו את השורה של import * as gameRules...
const prisma = new PrismaClient();

const userAnswerService = {
  async submitAnswer(userId, { questionId, selectedOptionId, wager = 0 }) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { game: true },
    });

    if (!question) throw new Error('Question not found');
    if (question.isResolved) throw new Error('Question is already closed');
    if (question.game.status !== 'ACTIVE')
      throw new Error('Game is not active');

    return await prisma.userAnswer.upsert({
      where: {
        userId_questionId: { userId, questionId },
      },
      update: {
        selectedOptionId,
        wager,
      },
      create: {
        userId,
        questionId,
        selectedOptionId,
        wager,
      },
    });
  },
};

export default userAnswerService;
