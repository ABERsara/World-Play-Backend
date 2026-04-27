// נתיבי עוקבים — follow, unfollow ושליפת רשימת עוקבים, מוגנים ב-auth
import express from 'express';
import followController from '../controller/follow.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', authenticateToken, followController.followUser);
router.get('/my-followers', authenticateToken, followController.getFollowers);
router.delete('/', authenticateToken, followController.unfollowUser);

export default router;
