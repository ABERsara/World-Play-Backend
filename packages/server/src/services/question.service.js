import * as gameRules from '../services/validation.service.js';
import permissionsService from './permissions.service.js';
import { PrismaClient } from '@prisma/client';
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
    // 2. יצירת השאלה עם האופציות בטרנזקציה אחת

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
   * עדכון התשובה הנכונה וסגירת השאלה
   */
  async resolveQuestion(questionId, userId, correctOptionId) {
    // א. קודם שולפים את השאלה כדי להבין לאיזה משחק היא שייכת
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) throw new Error('Question not found');

    // ב. בדיקת הרשאה: האם המשתמש הוא מנחה במשחק הספציפי הזה?
    await permissionsService.ensureModerator(question.gameId, userId);
    //  ביצוע הטרנזקציה (עדכון הנתונים)
    await prisma.$transaction([
      // איפוס תשובות קודמות
      prisma.questionOption.updateMany({
        where: { questionId },
        data: { isCorrect: false },
      }),
      // סימון התשובה הנכונה
      prisma.questionOption.update({
        where: { id: correctOptionId },
        data: { isCorrect: true },
      }),
      // סגירת השאלה
      prisma.question.update({
        where: { id: questionId },
        data: { isResolved: true },
      }),
    ]);

    // 2. החזרת השאלה המעודכנת (כדי שהקונטרולר לא יצטרך לקרוא לפריזמה ישירות)
    // זה פותר את הבעיה בקונטרולר וחוסך שם import
    return await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
  },
};

export default questionService;
