import express from 'express';
import economyController from '../controller/economy.controller.js';

const router = express.Router();

// נתיב לשליחת מתנה - POST /api/economy/send-gift
router.post('/send-gift', economyController.sendGift);

export default router;
