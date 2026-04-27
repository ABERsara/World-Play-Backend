// נתיבי משחקים — יצירה, הצטרפות, עדכון סטטוס, פיד, היסטוריה וצפיות
import express from 'express';
import gameController from '../controller/game.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', gameController.createGame);
router.put('/:id/status', gameController.updateStatus);
router.post('/:id/join', gameController.joinGame);
router.get('/feed', gameController.getFeed);
router.get('/history', gameController.getHistory);
router.patch('/:gameId/pin', gameController.togglePin);
router.post('/migrate-activities', gameController.migrateActivities);
router.post('/seed-viewlogs', gameController.seedViewLogs);
router.get('/:gameId/viewers', gameController.getGameViewers);

export default router;
