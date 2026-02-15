import express from 'express';
import financeController from '../controller/finance.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/card', financeController.addCreditCard);
router.post('/transaction', financeController.startTransaction);

export default router;
