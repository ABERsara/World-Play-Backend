// src/routes/question.routes.js
// ✅ עדכון: נתיבים נוספים לשאלות

import express from 'express';
import questionController from '../controller/question.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import userAnswerController from '../controller/userAnswer.controller.js';

const router = express.Router();

// כל הנתיבים מוגנים - דורשים אימות
router.use(authenticateToken);

// =========================================
// 📝 נתיבי יצירה ועדכון שאלות
// =========================================

/**
 * POST /api/questions
 * יצירת שאלה חדשה
 * Body: { gameId, questionText, rewardType?, options: [...] }
 */
router.post('/', questionController.addQuestion);

/**
 * PATCH /api/questions/:id/resolve
 * סגירת שאלה והכרזה על תשובה נכונה
 * Body: { optionId }
 */
router.patch('/:id/resolve', questionController.resolveQuestion);

// =========================================
// 🔍 נתיבי שליפה
// =========================================

/**
 * GET /api/questions/:id
 * שליפת שאלה בודדת עם כל הפרטים
 */
router.get('/:id', questionController.getQuestion);
router.get('/:gameId/questions', questionController.getGameQuestions);
/**
 * GET /api/games/:gameId/questions
 * שליפת כל השאלות במשחק ספציפי
 * (הוספתי את הנתיב הזה כאן כי הוא קשור לשאלות)
 */
router.get('/game/:gameId', questionController.getGameQuestions);

// =========================================
// 🎯 נתיבי תשובות משתמשים
// =========================================

/**
 * POST /api/questions/answer
 * שליחת תשובה לשאלה (משחקן/צופה)
 * Body: { questionId, selectedOptionId, wager? }
 */
router.post('/answer', userAnswerController.submit);

export default router;
