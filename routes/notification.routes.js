import { Router } from 'express';
import {
  createTestNotification,
  getMyNotifications,
  markAsRead,
} from '../controller/notification.controller.js';

const router = Router();

// GET /api/notifications?userId=...
router.get('/', getMyNotifications);

// PUT /api/notifications/:notificationId/read
router.put('/:notificationId/read', markAsRead);

// --- הוספנו את השורה הזו לבדיקה ---
router.post('/create', createTestNotification);

export default router;
