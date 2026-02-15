// src/controller/question.controller.js
// ✅ עדכון: אינטגרציה מלאה עם סנכרון real-time

import questionService from '../services/question.service.js';
import {
  syncUserBalances,
  syncGameScores,
  broadcastEconomyEvent,
} from '../utils/socketHelpers.js';

const questionController = {
  /**
   * POST /api/questions
   * הוספת שאלה חדשה למשחק
   */
  async addQuestion(req, res) {
    try {
      const userId = req.user.id;
      const { gameId, questionText, rewardType, options } = req.body;

      // ולידציות בסיסיות
      if (!gameId || !questionText) {
        return res.status(400).json({
          error: 'חסרים שדות חובה: gameId, questionText',
        });
      }

      if (!options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          error: 'חובה לספק לפחות 2 אופציות לתשובה',
        });
      }

      // יצירת השאלה
      const newQuestion = await questionService.createQuestion(gameId, userId, {
        questionText,
        rewardType,
        options,
      });

      // שידור לכל המשתתפים במשחק
      const io = req.app.get('io');
      if (io) {
        io.to(gameId).emit('game:new_question', {
          questionId: newQuestion.id,
          questionText: newQuestion.questionText,
          rewardType: newQuestion.rewardType,
          options: newQuestion.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      res.status(201).json({
        message: 'השאלה נוספה בהצלחה',
        question: newQuestion,
      });
    } catch (error) {
      console.error('Add Question Error:', error);

      // טיפול בשגיאות ספציפיות
      if (error.message === 'Game not found') {
        return res.status(404).json({ error: 'המשחק לא נמצא' });
      }

      if (
        error.message.includes('Permission denied') ||
        error.message.includes('Unauthorized')
      ) {
        return res.status(403).json({ error: error.message });
      }

      if (error.message.includes('Action not allowed')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'שגיאה ביצירת השאלה' });
    }
  },

  /**
   * PATCH /api/questions/:id/resolve
   * סגירת שאלה וחלוקת כספים
   */
  async resolveQuestion(req, res) {
    try {
      const { id: questionId } = req.params;
      const { optionId } = req.body;
      const userId = req.user.id;

      // ולידציה בסיסית
      if (!optionId) {
        return res
          .status(400)
          .json({ error: 'חובה לשלוח optionId (התשובה הנכונה)' });
      }

      // סגירת השאלה + חלוקת כספים
      console.log(`[CONTROLLER] Resolving question ${questionId}...`);
      const result = await questionService.resolveQuestion(
        questionId,
        userId,
        optionId
      );

      // ✅ סנכרון Real-time
      const io = req.app.get('io');
      const gameId = result.question.gameId;

      if (io) {
        // 1. עדכון יתרות למשתמשים שקיבלו כסף
        if (result.distribution?.distributions) {
          const affectedUsers = result.distribution.distributions.map(
            (d) => d.userId
          );

          // הוספת משתמשים שקיבלו בונוס תשובה נכונה
          if (result.correctAnswerRewards) {
            const bonusUsers = result.correctAnswerRewards.map((r) => r.userId);
            affectedUsers.push(...bonusUsers);
          }

          // הסרת כפילויות
          const uniqueUsers = [...new Set(affectedUsers)];
          await syncUserBalances(io, uniqueUsers);
        }

        // 2. עדכון טבלת הניקוד במשחק
        await syncGameScores(io, gameId);

        // 3. שידור אירוע סגירת שאלה
        io.to(gameId).emit('game:question_resolved', {
          questionId,
          correctOptionId: optionId,
          distribution: {
            totalPot: result.distribution?.totalPot || 0,
            type: result.summary.rewardType,
            participantsRewarded: result.summary.participantsRewarded,
          },
          timestamp: new Date().toISOString(),
        });

        // 4. אירוע כלכלי כללי
        broadcastEconomyEvent(io, gameId, 'POT_DISTRIBUTED', {
          questionId,
          totalAmount: result.distribution?.totalPot || 0,
          rewardType: result.summary.rewardType,
        });
      }

      // החזרת תוצאות
      res.status(200).json({
        message: 'השאלה נסגרה והכספים חולקו בהצלחה',
        question: result.question,
        distribution: result.distribution,
        rewards: result.correctAnswerRewards,
        summary: result.summary,
      });
    } catch (error) {
      console.error('Resolve Question Error:', error);

      // טיפול בשגיאות
      if (error.message === 'Question not found') {
        return res.status(404).json({ error: 'השאלה לא נמצאה' });
      }

      if (error.message.includes('already resolved')) {
        return res.status(400).json({ error: 'השאלה כבר נסגרה' });
      }

      if (
        error.message.includes('Permission denied') ||
        error.message.includes('Unauthorized')
      ) {
        return res.status(403).json({ error: 'אין הרשאה לסגור שאלה זו' });
      }

      res.status(500).json({
        error: 'שגיאה בסגירת השאלה',
        details: error.message,
      });
    }
  },

  /**
   * GET /api/questions/:id
   * קבלת שאלה בודדת
   */
  async getQuestion(req, res) {
    try {
      const { id } = req.params;
      const question = await questionService.getQuestionById(id);

      res.status(200).json({ question });
    } catch (error) {
      console.error('Get Question Error:', error);

      if (error.message === 'Question not found') {
        return res.status(404).json({ error: 'השאלה לא נמצאה' });
      }

      res.status(500).json({ error: 'שגיאה בשליפת השאלה' });
    }
  },

  /**
   * GET /api/games/:gameId/questions
   * קבלת כל השאלות במשחק
   */
  async getGameQuestions(req, res) {
    try {
      const { gameId } = req.params;
      const questions = await questionService.getGameQuestions(gameId);

      res.status(200).json({
        gameId,
        count: questions.length,
        questions,
      });
    } catch (error) {
      console.error('Get Game Questions Error:', error);

      if (error.message === 'Game not found') {
        return res.status(404).json({ error: 'המשחק לא נמצא' });
      }

      res.status(500).json({ error: 'שגיאה בשליפת השאלות' });
    }
  },
};

export default questionController;
