// routes/follow.routes.js
import express from 'express';
import followController from '../controller/follow.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// בצע מעקב
router.post('/', authenticateToken, followController.followUser);

router.get('/my-followers', authenticateToken, followController.getFollowers);
// הסר מעקב
router.delete('/', authenticateToken, followController.unfollowUser);

export default router;
