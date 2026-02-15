import { PrismaClient } from '@prisma/client';
import * as gameRules from '../services/validation.service.js';
const prisma = new PrismaClient();

const analyticsService = {
  /**
   * יצירת לוג צפייה (דוח משתמש)
   */
  async createViewLog(userId, reportData) {
    const { gameId, duration, totalQuestions, correctAnswers } = reportData;

    // 1. שימוש בפונקציה קיימת: וידוא קיום המשחק ושליפת הנתונים שלו
    // הפונקציה הזו (מהקובץ validation) כבר מחזירה את ה-game אם הוא קיים
    const game = await gameRules.ensureGameExists(gameId);
    // 2. חישוב אחוזי השתתפות (לוגיקה עסקית פשוטה שנשארת כאן)
    let participationPercent = 0;
    if (totalQuestions > 0) {
      participationPercent = correctAnswers / totalQuestions;
    }

    // 3. יצירת הלוג
    const newLog = await prisma.viewLog.create({
      data: {
        userId: userId,
        gameId: gameId,
        hostId: game.hostId, // ה-game חזר מ-ensureGameExists ולכן יש לו hostId
        duration: duration,
        answersCount: totalQuestions,
        participationPercent: participationPercent,
      },
    });

    return newLog;
  },
};

export default analyticsService;
