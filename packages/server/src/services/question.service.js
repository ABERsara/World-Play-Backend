/**
 * question.service.js
 *
 * שכבת השירות לניהול שאלות במשחק — יצירה, סגירה, ושליפה.
 * סגירת שאלה (resolveQuestion) מפעילה אוטומטית את מנוע הכלכלה לחלוקת הקופה.
 *
 * סוגי שאלות:
 *   STANDARD        — חלוקה פרופורציונלית בין שחקנים + 125% לעונים נכון
 *   WINNER_TAKES_ALL — 85% לזוכה, 15% למנחה
 *
 * פונקציות:
 *   createQuestion(gameId, userId, data)              — יצירת שאלה עם אופציות
 *   resolveQuestion(questionId, userId, optionId)     — סגירת שאלה + חלוקת כסף
 *   getGameQuestions(gameId)                          — כל שאלות המשחק
 *   getQuestionById(questionId)                       — שאלה בודדת עם פרטים
 *
 * מתקשר עם: Prisma → Question, QuestionOption, UserAnswer
 * תלוי ב:   validation.service.js, permissions.service.js, economy.service.js
 * משמש את:  question.controller.js, Socket.IO event handlers
 */
import * as gameRules from '../services/validation.service.js';
import permissionsService from './permissions.service.js';
import economyService from './economy.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const questionService = {
  async createQuestion(gameId, userId, { questionText, rewardType, options }) {
    const game = await gameRules.ensureGameExists(gameId);
    gameRules.validateGameIsActive(game);
    gameRules.validateQuestionData(questionText, options);
    await permissionsService.ensureModerator(gameId, userId);

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
            linkedPlayerId: option.linkedPlayerId || null, // חיוני ל-WINNER_TAKES_ALL
          })),
        },
      },
      include: { options: true },
    });
  },

  async resolveQuestion(questionId, userId, correctOptionId) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { game: true },
    });

    if (!question) throw new Error('Question not found');
    if (question.isResolved) throw new Error('Question is already resolved');

    await permissionsService.ensureModerator(question.gameId, userId);

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

    let distributionResult = null;

    if (question.rewardType === 'WINNER_TAKES_ALL') {
      distributionResult = await economyService.processWinnerPayout(
        questionId,
        correctOptionId,
        userId,
        question.gameId
      );
    } else {
      distributionResult = await economyService.distributeStandardPot(
        questionId,
        question.gameId,
        userId
      );
    }

    const correctAnswers = await prisma.userAnswer.findMany({
      where: { questionId, selectedOptionId: correctOptionId },
      select: { userId: true, wager: true },
    });

    const rewardResults = [];

    for (const answer of correctAnswers) {
      const rewardResult = await economyService.rewardCorrectAnswer(
        answer.userId,
        questionId,
        question.gameId
      );

      if (rewardResult.rewarded) {
        rewardResults.push({ userId: answer.userId, ...rewardResult });
      }
    }

    const resolvedQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: true,
        answers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return {
      question: resolvedQuestion,
      distribution: distributionResult,
      correctAnswerRewards: rewardResults,
      summary: {
        totalPot: distributionResult?.totalPot || 0,
        rewardType: question.rewardType,
        participantsRewarded: rewardResults.length,
        timestamp: new Date(),
      },
    };
  },

  async getGameQuestions(gameId) {
    await gameRules.ensureGameExists(gameId);

    return await prisma.question.findMany({
      where: { gameId },
      include: {
        options: true,
        answers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getQuestionById(questionId) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: true,
        answers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        game: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    return question;
  },
};

export default questionService;
