import express from 'express';
import economyController from '../controller/economy.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// נתיב לשליחת מתנה - מוגן בטוקן
router.post('/send', authenticateToken, economyController.sendGift);

export default router;
