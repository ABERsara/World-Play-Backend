import express from 'express';
import gameController from '../controller/game.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// POST /api/games
router.post('/', gameController.createGame);

// עדכון סטטוס (ACTIVE, PAUSED, FINISHED)
// PUT /api/games/{GAME_ID}/status
router.put('/:id/status', gameController.updateStatus);

//הצטרפות למשחק
// POST /api/games/{GAME_ID}/join
router.post('/:id/join', gameController.joinGame);

// GET /api/games/feed
router.get('/feed', authenticateToken, gameController.getFeed);

// GET /api/games/history
router.get('/history', gameController.getHistory);

// PATCH /api/games/:gameId/pin
router.patch('/:gameId/pin', gameController.togglePin);

router.post('/migrate-activities', gameController.migrateActivities);

// GET /api/games/:gameId/viewers
router.get('/:gameId/viewers', gameController.getGameViewers);

router.post('/seed-viewlogs', gameController.seedViewLogs);

// PATCH /api/games/:gameId/camera
router.patch('/:gameId/camera', gameController.toggleCamera);

// PATCH /api/games/:gameId/grant-moderator-invite
router.patch(
  '/:gameId/grant-moderator-invite',
  gameController.grantModeratorInvite
);

export default router;
