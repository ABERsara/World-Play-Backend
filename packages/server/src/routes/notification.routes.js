// נתיבי התראות — שליפה, סימון כנקרא ויצירה ידנית לבדיקות
import { Router } from 'express';
import {
  createTestNotification,
  getMyNotifications,
  markAsRead,
} from '../controller/notification.controller.js';

const router = Router();

router.get('/', getMyNotifications);
router.put('/:notificationId/read', markAsRead);
router.post('/create', createTestNotification);

export default router;
