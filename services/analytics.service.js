// services/analytics.service.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createViewLog = async (userId, reportData) => {
  const { gameId, duration, totalQuestions, correctAnswers } = reportData;

  // 1. קודם כל, נשלוף את המשחק כדי להבין מי ה-Host שלו
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { hostId: true } // אנחנו צריכים רק את ה-ID של המארח
  });

  if (!game) {
    throw new Error("Game not found");
  }

  // 2. חישוב אחוזי השתתפות
  let participationPercent = 0;
  if (totalQuestions > 0) {
    participationPercent = correctAnswers / totalQuestions;
  }

  // 3. יצירת הלוג עם ה-hostId ששלפנו
  const newLog = await prisma.viewLog.create({
    data: {
      userId: userId,
      gameId: gameId,
      hostId: game.hostId, // <--- הנה התוספת הקריטית לפי ההנחיה של משה
      duration: duration,
      answersCount: totalQuestions,
      participationPercent: participationPercent,
    },
  });

  return newLog;
};