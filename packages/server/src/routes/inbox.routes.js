// routes/inbox.routes.js
import express from 'express';
import inboxController from '../controller/inbox.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// הנתיב המרכזי לקבלת כל האירועים ב-Inbox
// אנחנו מוסיפים authMiddleware כי ה-Inbox הוא אישי לכל משתמש
router.get('/', authenticateToken, inboxController.getInbox);

// סימון פריט כנקרא
router.patch('/:id/read', authenticateToken, inboxController.markAsRead);

export default router;
