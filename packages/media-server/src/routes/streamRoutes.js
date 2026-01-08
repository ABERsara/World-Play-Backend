import express from 'express';
import { StreamController } from '../controllers/streamController.js';

const router = express.Router();

// ✅ הסר את ההערה! זה ה-route החשוב ביותר
router.post('/:streamId', StreamController.start);

router.post('/:streamId/pause', StreamController.pause);
router.post('/:streamId/resume', StreamController.resume);

export default router;