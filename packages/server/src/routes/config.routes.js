// מחזיר למובייל את כתובת שרת המדיה דרך env
import express from 'express';
const router = express.Router();

router.get('/media-server', (req, res) => {
  const url =
    process.env.MOBILE_MEDIA_SERVER_URL || 'http://192.168.33.17:10007';

  res.json({
    url: url,
    status: 'active',
    version: '1.0.0',
  });
});

export default router;
