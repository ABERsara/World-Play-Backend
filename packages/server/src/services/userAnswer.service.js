// packages/server/src/services/userAnswer.service.js
import { PrismaClient } from '@prisma/client';
import { syncUserBalances } from '../utils/balanceSync.js';
import { SubmitAnswerSchema } from '../../../shared/src/index.js';

const prisma = new PrismaClient();

// const userAnswerService = {
// async submitAnswer(io, userId, inputData) {
//   // א. ולידציה עם Zod
//   const validatedData = SubmitAnswerSchema.parse(inputData);
//   const { questionId, selectedOptionId, wager } = validatedData;

//   // ב. בדיקות מקדימות
//   const question = await prisma.question.findUnique({
//     where: { id: questionId },
//     include: { game: true },
//   });

//   if (!question) throw new Error('Question not found');
//   if (question.isResolved) throw new Error('Question is already closed');
//   if (question.game.status !== 'ACTIVE') throw new Error('Game is not active');

//   // ג. טרנזקציה: ניכוי מטבעות ויצירת התשובה
//   const result = await prisma.$transaction(async (tx) => {
//     // 1. בדיקה אם למשתמש יש מספיק מטבעות
//     const user = await tx.user.findUnique({
//       where: { id: userId },
//       select: { walletBalance: true }
//     });

//     if (Number(user.walletBalance) < wager) {
//       throw new Error('אין מספיק מטבעות בארנק לביצוע ההימור');
//     }

//     // 2. ניכוי המטבעות מהארנק
//     await tx.user.update({
//       where: { id: userId },
//       data: { walletBalance: { decrement: wager } }
//     });

//     // 3. שמירת התשובה/הימור (upsert)
//     const answer = await tx.userAnswer.upsert({
//       where: { userId_questionId: { userId, questionId } },
//       update: { selectedOptionId, wager },
//       create: { userId, questionId, selectedOptionId, wager },
//     });

//     return { answer, gameId: question.gameId };
//   });

//   // ד. סנכרון מיידי של היתרה החדשה ב-UI דרך Socket.io
//   // הקריאה תמיד בסוף ה-await כדי להבטיח שהטרנזקציה נסגרה
//   await syncUserBalances(io, userId, result.gameId);

//   return result.answer;
// },
// packages/server/src/services/userAnswer.service.js
//  }
const userAnswerService = {
  async submitAnswer(io, userId, inputData) {
    // 1. ולידציה... (נשאר אותו דבר)
    const validatedData = SubmitAnswerSchema.parse(inputData);
    const { questionId, selectedOptionId, wager } = validatedData;

    // 2. ביצוע השינויים בבסיס הנתונים (הורדת מטבעות ושמירת תשובה)
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
        where: {
          userId_questionId: { userId, questionId },
        },
        update: {
          wager: wager,
          option: { connect: { id: selectedOptionId } },
        },
        create: {
          wager: wager,
          user: { connect: { id: userId } },
          question: { connect: { id: questionId } },
          option: { connect: { id: selectedOptionId } },
        },
      });

      const question = await tx.question.findUnique({
        where: { id: questionId },
      });
      return { answer, gameId: question.gameId };
    });

    // --- כאן השינוי הקריטי למהירות ---
    // אנחנו קוראים לסנכרון רק אחרי שהטרנזקציה הסתיימה לחלוטין (מחוץ לבלוק ה-$transaction)
    // זה מבטיח שהסוקט ישלח את הערך החדש רק כשהוא כבר "נעול" בבסיס הנתונים
    setImmediate(async () => {
      try {
        await syncUserBalances(io, userId, result.gameId);
      } catch (err) {
        console.error('Delayed sync failed:', err);
      }
    });

    return result.answer;
  },
};

export default userAnswerService;
