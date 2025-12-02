import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import userController from '../controller/user.controller.js';

const router = express.Router();

router.post('/register', userController.register);
router.post('/login', userController.login);

router.get('/profile', authenticateToken, userController.getProfile);

export default router;
