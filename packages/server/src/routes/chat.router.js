// נתיבי צ'אט — היסטוריית הודעות ושליחה בין משתמשים
import { Router } from 'express';
import {
  getChatHistory,
  sendMessageAPI,
} from '../controller/chat.controller.js';

const router = Router();

router.get('/history/:otherUserId', getChatHistory);
router.post('/send', sendMessageAPI);

export default router;
