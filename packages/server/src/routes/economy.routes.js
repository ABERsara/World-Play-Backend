// נתיב שליחת מתנות בין משתמשים — מוגן ב-auth
import express from 'express';
import economyController from '../controller/economy.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/gifts/send', authenticateToken, economyController.sendGift);

export default router;
