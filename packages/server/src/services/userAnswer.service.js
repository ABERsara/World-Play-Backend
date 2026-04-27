/**
 * userAnswer.service.js
 *
 * שכבת השירות להגשת תשובות והימורים על שאלות במשחק.
 * כל הגשה מנוכה מהארנק ונשמרת בטרנזקציה אטומית.
 * לאחר הטרנזקציה מתבצע סנכרון יתרה ל-UI דרך Socket.IO.
 *
 * פונקציות:
 *   submitAnswer(io, userId, inputData) — ולידציה + ניכוי מטבעות + שמירת תשובה
 *
 * מתקשר עם: Prisma → User, UserAnswer, Question
 * תלוי ב:   SubmitAnswerSchema (Zod validation), balanceSync (Socket.IO sync)
 * משמש את:  Socket.IO event handlers (submit_answer event)
 */
import { PrismaClient } from '@prisma/client';
import { syncUserBalances } from '../utils/balanceSync.js';
import { SubmitAnswerSchema } from '../../../shared/src/index.js';

const prisma = new PrismaClient();

const userAnswerService = {
  async submitAnswer(io, userId, inputData) {
    const validatedData = SubmitAnswerSchema.parse(inputData);
    const { questionId, selectedOptionId, wager } = validatedData;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { game: true },
    });

    if (!question) throw new Error('Question not found');
    if (question.isResolved) throw new Error('Question is already closed');
    if (question.game.status !== 'ACTIVE')
      throw new Error('Game is not active');

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      });

      if (Number(user.walletBalance) < wager) {
        throw new Error('אין מספיק מטבעות בארנק לביצוע ההימור');
      }

      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: wager } },
      });

      const answer = await tx.userAnswer.upsert({
        where: { userId_questionId: { userId, questionId } },
        update: {
          wager,
          option: { connect: { id: selectedOptionId } },
        },
        create: {
          wager,
          user: { connect: { id: userId } },
          question: { connect: { id: questionId } },
          option: { connect: { id: selectedOptionId } },
        },
      });

      return { answer, gameId: question.gameId };
    });

    // סנכרון אחרי סגירת הטרנזקציה — מבטיח שהיתרה שנשלחת ל-UI כבר מעודכנת ב-DB
    setImmediate(async () => {
      try {
        await syncUserBalances(io, userId, result.gameId);
      } catch {
        // כישלון בסנכרון לא אמור להחזיר שגיאה למשתמש
      }
    });

    return result.answer;
  },
};

export default userAnswerService;
