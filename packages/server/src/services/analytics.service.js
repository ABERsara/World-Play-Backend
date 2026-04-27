// שירות analytics — יצירת לוגי צפייה וחישוב אחוזי השתתפות
import { PrismaClient } from '@prisma/client';
import * as gameRules from '../services/validation.service.js';
const prisma = new PrismaClient();

const analyticsService = {
  async createViewLog(userId, reportData) {
    const { gameId, duration, totalQuestions, correctAnswers } = reportData;

    const game = await gameRules.ensureGameExists(gameId);

    let participationPercent = 0;
    if (totalQuestions > 0) {
      participationPercent = correctAnswers / totalQuestions;
    }

    const newLog = await prisma.viewLog.create({
      data: {
        userId: userId,
        gameId: gameId,
        hostId: game.hostId,
        duration: duration,
        answersCount: totalQuestions,
        participationPercent: participationPercent,
      },
    });

    return newLog;
  },
};

export default analyticsService;
