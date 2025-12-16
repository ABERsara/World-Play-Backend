import express from 'express';
import streamController from '../controller/stream.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', streamController.createStream);
router.put('/:id/status', streamController.updateStatus);

export default router;
