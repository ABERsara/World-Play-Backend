// src/services/question.service.js
// ✅ עדכון: אינטגרציה מלאה עם מנוע החלוקה העשרוני

import * as gameRules from '../services/validation.service.js';
import permissionsService from './permissions.service.js';
import economyService from './economy.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const questionService = {
  /**
   * יצירת שאלה חדשה עם אופציות
   *
   * @param {string} gameId - מזהה המשחק
   * @param {string} userId - מזהה המנחה
   * @param {Object} data - { questionText, rewardType, options }
   * @returns {Promise<Object>} השאלה שנוצרה
   */
  async createQuestion(gameId, userId, { questionText, rewardType, options }) {
    // 1. בדיקות ולידציה בסיסיות
    const game = await gameRules.ensureGameExists(gameId);
    gameRules.validateGameIsActive(game);
    gameRules.validateQuestionData(questionText, options);
    await permissionsService.ensureModerator(gameId, userId);

    // 2. יצירת השאלה עם האופציות
    const newQuestion = await prisma.question.create({
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
      include: {
        options: true,
      },
    });

    console.log(
      `[QUESTION] Created question ${newQuestion.id} of type ${rewardType}`
    );

    return newQuestion;
  },

  /**
   * עדכון התשובה הנכונה וסגירת השאלה + חלוקת הכסף
   *
   * @param {string} questionId - מזהה השאלה
   * @param {string} userId - מזהה המנחה
   * @param {string} correctOptionId - מזהה האופציה הנכונה
   * @returns {Promise<Object>} תוצאות הסגירה והחלוקה
   */
  async resolveQuestion(questionId, userId, correctOptionId) {
    // א. שליפת השאלה כדי להבין לאיזה משחק היא שייכת ומה סוג הפרס
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { game: true },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    if (question.isResolved) {
      throw new Error('Question is already resolved');
    }

    console.log(
      `[QUESTION] Resolving question ${questionId} (type: ${question.rewardType})`
    );

    // ב. בדיקת הרשאה למנחה
    await permissionsService.ensureModerator(question.gameId, userId);

    // ג. סגירת השאלה ב-DB (איפוס אופציות, סימון נכונה)
    await prisma.$transaction([
      // איפוס כל האופציות
      prisma.questionOption.updateMany({
        where: { questionId },
        data: { isCorrect: false },
      }),
      // סימון האופציה הנכונה
      prisma.questionOption.update({
        where: { id: correctOptionId },
        data: { isCorrect: true },
      }),
      // נעילת השאלה
      prisma.question.update({
        where: { id: questionId },
        data: { isResolved: true },
      }),
    ]);

    // ד. חלוקת הכסף לפי סוג השאלה
    let distributionResult = null;

    if (question.rewardType === 'WINNER_TAKES_ALL') {
      // שאלת "מי ינצח" - חלוקה 85/15
      console.log('[QUESTION] Processing WINNER_TAKES_ALL distribution...');
      distributionResult = await economyService.processWinnerPayout(
        questionId,
        correctOptionId,
        userId, // המנחה
        question.gameId
      );
    } else {
      // שאלה רגילה (STANDARD) - חלוקה פרופורציונלית
      console.log('[QUESTION] Processing STANDARD pot distribution...');
      distributionResult = await economyService.distributeStandardPot(
        questionId,
        question.gameId,
        userId // המנחה
      );
    }

    // ה. זיכוי בונוס (125%) לכל מי שענה נכון
    console.log('[QUESTION] Checking for correct answers to reward...');

    const correctAnswers = await prisma.userAnswer.findMany({
      where: {
        questionId,
        selectedOptionId: correctOptionId,
      },
      select: {
        userId: true,
        wager: true,
      },
    });

    const rewardResults = [];

    for (const answer of correctAnswers) {
      const rewardResult = await economyService.rewardCorrectAnswer(
        answer.userId,
        questionId,
        question.gameId
      );

      if (rewardResult.rewarded) {
        rewardResults.push({
          userId: answer.userId,
          ...rewardResult,
        });
      }
    }

    console.log(`[QUESTION] Rewarded ${rewardResults.length} correct answers`);

    // ו. החזרת תוצאות מלאות
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

  /**
   * קבלת כל השאלות במשחק
   *
   * @param {string} gameId - מזהה המשחק
   * @returns {Promise<Array>} רשימת השאלות
   */
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

  /**
   * קבלת שאלה בודדת עם כל הפרטים
   *
   * @param {string} questionId - מזהה השאלה
   * @returns {Promise<Object>} השאלה
   */
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
