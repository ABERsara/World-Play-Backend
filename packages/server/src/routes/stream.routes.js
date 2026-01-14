import express from 'express';
import streamController from '../controller/stream.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// נתיבים ציבוריים (ללא טוקן - אם ה-Media Server פונה מבחוץ)
// אם ה-Media Server בתוך הדוקר, הוא יכול לפנות בלי טוקן בראוט ייעודי
router.post('/pause', streamController.pauseStream);

// נתיבים מוגנים (דורשים טוקן משתמש)
router.use(authenticateToken);

router.post('/', streamController.createStream);
router.put('/:id/status', streamController.updateStatus);
router.post('/:streamId/start', streamController.start);
router.post('/question-pause', streamController.handleQuestionPause);

export default router;
