import { PrismaClient, Prisma } from '@prisma/client'; // ייבוא Prisma עבור טיפוס ה-Decimal
import * as gameRules from '../services/validation.service.js';
import permissionsService from './permissions.service.js';
import economyService from './economy.service.js';

const prisma = new PrismaClient();

const questionService = {
  /**
   * יצירת שאלה חדשה עם אופציות
   */
  async createQuestion(gameId, userId, { questionText, rewardType, options }) {
    // 1. בדיקות ולידציה בסיסיות
    const game = await gameRules.ensureGameExists(gameId);
    gameRules.validateGameIsActive(game);
    gameRules.validateQuestionData(questionText, options);
    await permissionsService.ensureModerator(gameId, userId);

    // 2. יצירת השאלה עם האופציות
    return await prisma.question.create({
      data: {
        gameId,
        questionText,
        rewardType: rewardType || 'STANDARD',
        isResolved: false,
        options: {
          create: options.map((option) => ({
            text: option.text,
            isCorrect: option.isCorrect || false,
            linkedPlayerId: option.linkedPlayerId || null,
          })),
        },
      },
      include: {
        options: true,
      },
    });
  },

  /**
   * עדכון התשובה הנכונה וסגירת השאלה + חלוקת הקופה
   */
  async resolveQuestion(questionId, userId, correctOptionId) {
    // א. שליפת השאלה כולל האופציות
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });

    if (!question) throw new Error('Question not found');

    // ב. בדיקת הרשאה למנחה
    await permissionsService.ensureModerator(question.gameId, userId);

    // ג. ביצוע הטרנזקציה לעדכון ה-DB
    await prisma.$transaction([
      prisma.questionOption.updateMany({
        where: { questionId },
        data: { isCorrect: false },
      }),
      prisma.questionOption.update({
        where: { id: correctOptionId },
        data: { isCorrect: true },
      }),
      prisma.question.update({
        where: { id: questionId },
        data: { isResolved: true },
      }),
    ]);

    // ד. חלוקת הכסף לפי סוג השאלה (פרק 2 ו-3 באפיון)
    if (question.rewardType === 'WINNER_TAKES_ALL') {
      // חלוקת "מי ינצח" (85/15)
      await economyService.processWinnerPayout(
        questionId,
        correctOptionId,
        userId,
        question.gameId
      );
    } else {
      // שאלה סטנדרטית - חלוקת קופה (יחידות יחסיות) וזיכוי צופים (125%)
      await economyService.payoutCorrectViewers(
        questionId,
        correctOptionId,
        question.gameId
      );
      await economyService.processStandardPotDistribution(
        questionId,
        question.gameId,
        userId
      );
    }

    // ה. החזרת השאלה המעודכנת
    return await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
  },

  /**
   * שמירת תשובה (הימור) של משתמש על שאלה
   * פונקציה זו מתוקנת לדיוק עשרוני ולמניעת שגיאות Binary ב-Postgres
   */
  /**
   * שמירת תשובה (הימור) של משתמש על שאלה
   */
  async answerQuestion(questionId, userId, { selectedOptionId, wager }) {
    // 1. בדיקות ולידציה בסיסיות
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new Error('Question not found');
    if (question.isResolved) throw new Error('Question already closed');

    // 2. המרה לאובייקט Decimal - חשוב להמיר קודם למחרוזת!
    const decimalWager = new Prisma.Decimal(wager.toString());

    // 3. בדיקה שלארנק של המשתמש יש מספיק כסף
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (user.walletBalance.lt(decimalWager)) {
      throw new Error('Insufficient balance in wallet');
    }

    // 4. יצירת/עדכון ההימור עם אובייקט ה-Decimal המדויק
    return await prisma.userAnswer.upsert({
      where: {
        userId_questionId: { userId, questionId },
      },
      update: {
        selectedOptionId,
        wager: decimalWager, // שימוש ישיר ב-Decimal object
      },
      create: {
        userId,
        questionId,
        selectedOptionId,
        wager: decimalWager, // שימוש ישיר ב-Decimal object
      },
    });
  },
};

export default questionService;
