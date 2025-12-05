import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const questionService = {
  /**
   * יצירת שאלה חדשה עם אופציות
   */
  async createQuestion(gameId, { questionText, rewardType, options }) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');

    return await prisma.question.create({
      data: {
        gameId,
        questionText,
        rewardType: rewardType || 'STANDARD',
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
  }, // <--- שים לב לפסיק הזה! הוא מפריד בין הפונקציות

  /**
   * עדכון התשובה הנכונה וסגירת השאלה
   */
  async resolveQuestion(questionId, correctOptionId) {
    // 1. ביצוע הטרנזקציה (עדכון הנתונים)
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
