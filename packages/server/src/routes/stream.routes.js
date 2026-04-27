// נתיבי סטרים — יצירה, עדכון סטטוס, הפעלה והשהייה
import express from 'express';
import streamController from '../controller/stream.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/pause', streamController.pauseStream);
router.post('/', streamController.createStream);
router.put('/:id/status', streamController.updateStatus);
router.post('/question-pause', streamController.handleQuestionPause);

router.post('/:streamId/start', streamController.start);

export default router;
