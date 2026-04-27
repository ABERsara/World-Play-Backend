// נתיבי שאלות — יצירה, סגירה, שליפה ושליחת תשובות, מוגנים ב-auth
import express from 'express';
import questionController from '../controller/question.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import userAnswerController from '../controller/userAnswer.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', questionController.addQuestion);
router.patch('/:id/resolve', questionController.resolveQuestion);
router.get('/:id', questionController.getQuestion);
router.get('/:gameId/questions', questionController.getGameQuestions);
router.get('/game/:gameId', questionController.getGameQuestions);
router.post('/answer', userAnswerController.submit);

export default router;
