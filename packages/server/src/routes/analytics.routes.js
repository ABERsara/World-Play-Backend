// נתיבי analytics ופיד שידורים חיים — כולם מוגנים ב-auth
import express from 'express';
import * as feedController from '../controller/feed.controller.js';
import * as analyticsController from '../controller/analytics.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.post('/report', analyticsController.reportAnalytics);
router.get('/feed', feedController.getLiveFeed);

export default router;
