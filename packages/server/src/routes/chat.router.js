// נתיבי צ'אט — היסטוריית הודעות ושליחה בין משתמשים
import { Router } from 'express';
import {
  getChatHistory,
  sendMessageAPI,
} from '../controller/chat.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/history/:otherUserId', getChatHistory);
router.post('/send', sendMessageAPI);

export default router;
