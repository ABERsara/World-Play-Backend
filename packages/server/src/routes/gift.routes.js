// נתיב שליחת מתנה — מוגן ב-auth (ראה גם economy.routes.js)
import express from 'express';
import economyController from '../controller/economy.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/send', authenticateToken, economyController.sendGift);

export default router;
