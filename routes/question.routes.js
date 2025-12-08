import express from 'express';
import questionController from '../controller/question.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// הוספת שאלה חדשה
router.post('/', questionController.addQuestion);
// עדכון תשובה נכונה (סגירת שאלה)
router.put('/:id/resolve', questionController.resolveQuestion);

export default router;
