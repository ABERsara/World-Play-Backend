// נתיבי Inbox — שליפת הודעות וסימון כנקרא, מוגנים ב-auth
import express from 'express';
import inboxController from '../controller/inbox.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticateToken, inboxController.getInbox);
router.patch('/:id/read', authenticateToken, inboxController.markAsRead);

export default router;
