import express from 'express';
const router = express.Router();

// Middleware לתיעוד בקשות בטרמינל
router.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] Media Request: ${req.method} ${req.url}`
  );
  next();
});

// הודעת הברכה
router.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: '🚀 World-Play Media Server is Live and Running!',
    timestamp: new Date().toISOString(),
  });
});

export default router;
