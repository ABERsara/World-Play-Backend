import { Router } from 'express';
import {
  getChatHistory,
  sendMessageAPI,
} from '../controller/chat.controller.js';
// נניח שיש לך middleware לאימות משתמשים
// import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// נדרש GameId כדי לדעת איזה צ'אט לטעון
// שימי לב: שיניתי מ-gameId ל-otherUserId
router.get('/history/:otherUserId', getChatHistory);

router.post('/send', sendMessageAPI);

// אם צריך צ'אט פרטי, אפשר להוסיף:
// router.get('/private/:otherUserId', protect, getPrivateChat);

export default router;
