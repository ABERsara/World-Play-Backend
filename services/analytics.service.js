import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Service: יצירת לוג צפייה חדש
 * מקבל את ה-ID של המשתמש ואת נתוני הדיווח
 */
export const createViewLog = async (userId, reportData) => {
  const { gameId, duration, totalQuestions, correctAnswers } = reportData;

  // ביצוע לוגיקה וחישובים בתוך הסרביס
  let participationPercent = 0;
  if (totalQuestions > 0) {
    participationPercent = correctAnswers / totalQuestions;
  }

  // פנייה לדאטה-בייס
  const newLog = await prisma.viewLog.create({
    data: {
      userId: userId,
      gameId: gameId,
      duration: duration,
      answersCount: totalQuestions,
      participationPercent: participationPercent,
    },
  });

  return newLog;
};