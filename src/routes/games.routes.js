import express from 'express';
import gameController from '../controller/game.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// יצירת משחק (דורש streamId ב-Body)
// POST /api/games
router.post('/', gameController.createGame);

// עדכון סטטוס (למשל לסיום המשחק)
// PUT /api/games/{GAME_ID}/status
router.put('/:id/status', gameController.updateStatus);

//הצטרפות למשחק
// POST /api/games/{GAME_ID}/join
router.post('/:id/join', gameController.joinGame);

export default router;
