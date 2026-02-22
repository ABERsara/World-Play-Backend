import * as gameRules from '../services/validation.service.js';
import permissionsService from './permissions.service.js';
import economyService from './economy.service.js'; // הייבוא החדש
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const questionService = {
  /**
   * יצירת שאלה חדשה עם אופציות
   */
  async createQuestion(gameId, userId, { questionText, rewardType, options }) {
    // 1. בדיקות ולידציה בסיסיות (נשאר כפי שהיה)
    const game = await gameRules.ensureGameExists(gameId);
    gameRules.validateGameIsActive(game);
    gameRules.validateQuestionData(questionText, options);
    await permissionsService.ensureModerator(gameId, userId);

    // 2. יצירת השאלה עם האופציות - כולל linkedPlayerId (משימה 1)
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
    // א. שליפת השאלה כדי להבין לאיזה משחק היא שייכת ומה סוג הפרס
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) throw new Error('Question not found');

    // ב. בדיקת הרשאה למנחה
    await permissionsService.ensureModerator(question.gameId, userId);

    // ג. ביצוע הטרנזקציה לעדכון ה-DB (איפוס אופציות, סימון נכונה וסגירה)
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

    // --- ד. חלוקת הכסף (משימות 2 ו-3) ---
    // רק אם זו שאלת "מי ינצח", אנחנו מפעילים את ה-Economy Service
    if (question.rewardType === 'WINNER_TAKES_ALL') {
      await economyService.processWinnerPayout(
        questionId,
        correctOptionId,
        userId, // המנחה שמקבל 15%
        question.gameId
      );
    }

    // ה. החזרת השאלה המעודכנת
    return await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
  },
};

export default questionService;
