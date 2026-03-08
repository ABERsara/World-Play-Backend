// src/controller/question.controller.js
// ✅ עדכון סופי: אינטגרציה מלאה עם סנכרון ארנק וניקוד בזמן אמת

import questionService from '../services/question.service.js';
import {
  syncUserBalances,
  syncGameScores,
  broadcastEconomyEvent,
} from '../utils/socketHelpers.js';

const questionController = {
  /**
   * POST /api/questions
   * הוספת שאלה חדשה למשחק ושידור לכל המשתתפים
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

      // יצירת השאלה ב-DB דרך ה-Service
      const newQuestion = await questionService.createQuestion(gameId, userId, {
        questionText,
        rewardType,
        options,
      });

      // שידור השאלה החדשה לכל המשתתפים בחדר המשחק
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

      if (error.message === 'Game not found') {
        return res.status(404).json({ error: 'המשחק לא נמצא' });
      }

      if (
        error.message.includes('Permission denied') ||
        error.message.includes('Unauthorized')
      ) {
        return res.status(403).json({ error: error.message });
      }

      res.status(500).json({ error: 'שגיאה ביצירת השאלה' });
    }
  },

  /**
   * PATCH /api/questions/:id/resolve
   * סגירת שאלה, חלוקת כספים (85/15 או פרופורציונלי) וסנכרון ארנקים וניקוד
   */
  async resolveQuestion(req, res) {
    try {
      const { id: questionId } = req.params;
      const { optionId } = req.body;
      const userId = req.user.id;

      if (!optionId) {
        return res
          .status(400)
          .json({ error: 'חובה לשלוח optionId (התשובה הנכונה)' });
      }

      console.log(`[CONTROLLER] Resolving question ${questionId}...`);

      // ביצוע הלוגיקה הכלכלית ב-Service (כולל Prisma Transaction)
      const result = await questionService.resolveQuestion(
        questionId,
        userId,
        optionId
      );

      const io = req.app.get('io');
      const gameId = result.question.gameId;

      if (io) {
        // --- לוגיקת סנכרון Real-time מורחבת (ארנק + ניקוד) ---

        // 1. אם זו שאלת "מי ינצח" - סנכרון מיידי למנצח שקיבל 85%
        if (result.distribution?.winnerId) {
          await syncUserBalances(io, result.distribution.winnerId, gameId);
        }

        // 2. עדכון יתרות לכל שאר המשתתפים שהושפעו (בונוס 125%, חלוקת קופה רגילה וכו')
        const affectedUsers = [];

        if (result.distribution?.distributions) {
          affectedUsers.push(
            ...result.distribution.distributions.map((d) => d.userId)
          );
        }

        if (result.correctAnswerRewards) {
          affectedUsers.push(
            ...result.correctAnswerRewards.map((r) => r.userId)
          );
        }

        // הסרת כפילויות וסנכרון לכל משתמש בנפרד
        const uniqueUsers = [...new Set(affectedUsers)];
        for (const uId of uniqueUsers) {
          // סנכרון זה מעדכן ב-UI גם את הארנק וגם את הניקוד בזירה
          await syncUserBalances(io, uId, gameId);
        }

        // 3. עדכון המנחה (עמלת 15% או עמלת קופה רגילה)
        await syncUserBalances(io, userId, gameId);

        // 4. עדכון כללי של טבלת המובילים (Leaderboard) במשחק
        await syncGameScores(io, gameId);

        // שידור הודעת סגירת שאלה כללית לחדר
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

        // שידור אירוע כלכלי לתיעוד בלייב
        broadcastEconomyEvent(io, gameId, 'POT_DISTRIBUTED', {
          questionId,
          totalAmount: result.distribution?.totalPot || 0,
        });
      }

      res.status(200).json({
        message: 'השאלה נסגרה והכספים חולקו בהצלחה',
        question: result.question,
        distribution: result.distribution,
        rewards: result.correctAnswerRewards,
        summary: result.summary,
      });
    } catch (error) {
      console.error('Resolve Question Error:', error);

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
   * שליפת פרטי שאלה בודדת
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
   * שליפת כל השאלות של משחק ספציפי
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
