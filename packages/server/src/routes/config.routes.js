import express from 'express';
const router = express.Router();

// נתיב לקבלת כתובת שרת המדיה
router.get('/media-server', (req, res) => {
  // תמיד מחזיר את כתובת הרשת המקומית עבור לקוחות מובייל
  // זה יעבוד גם בדפדפן וגם באפליקציה
  const url = process.env.MOBILE_MEDIA_SERVER_URL;
  if (!url) {
    return res.status(500).json({ error: 'Media server URL not configured' });
  }

  res.json({
    url: url,
    status: 'active',
    version: '1.0.0',
  });
});

export default router;
