import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import userAnswerController from '../controller/userAnswer.controller.js';

const router = express.Router();
router.use(authenticateToken);

// נתיב שליחת תשובה - מוגן ע"י טוקן
router.post('/submit', userAnswerController.submit);

export default router;
