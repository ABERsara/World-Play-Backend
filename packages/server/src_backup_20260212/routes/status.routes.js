// packages/server/src/routes/status.routes.js
import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '🎮 World-Play MAIN API is Running!',
    timestamp: new Date().toISOString(),
  });
});

export default router;
