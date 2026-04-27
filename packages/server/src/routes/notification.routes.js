// נתיבי התראות — שליפה, סימון כנקרא ויצירה ידנית לבדיקות
import { Router } from 'express';
import {
  getMyNotifications,
  markAsRead,
} from '../controller/notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyNotifications);
router.put('/:notificationId/read', markAsRead);

export default router;
