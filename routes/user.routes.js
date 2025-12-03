import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
// תיקון: כאן אנחנו קוראים לקובץ המשתמשים בשם userController
import * as userController from '../controller/user.controller.js';
// וכאן לקובץ האימות בשם authController
import * as authController from '../controller/auth.controller.js';

const router = express.Router();

// נתיבי אימות (משתמשים ב-authController)
router.post('/register', authController.register);
router.post('/login', authController.login);

// נתיבי משתמשים מוגנים (משתמשים ב-userController)
router.get('/profile', authenticateToken, userController.getMe);
router.put('/profile', authenticateToken, userController.updateMe);

export default router;
