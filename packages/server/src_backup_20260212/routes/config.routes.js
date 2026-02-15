import express from 'express';
const router = express.Router();

// נתיב לקבלת כתובת שרת המדיה
router.get('/media-server', (req, res) => {
  res.json({
    url: process.env.NEXT_PUBLIC_MEDIA_SERVER_URL || 'http://localhost:8000',
    status: 'active',
    version: '1.0.0',
  });
});

export default router;
