import express from 'express';
// ייבוא הקונטרולר (שים לב לנתיב היחסי)
import { StreamController } from '../controllers/streamController.js';

const router = express.Router();

// הגדרת הנתיבים (Routes) וחיבורם לפונקציות בקונטרולר
router.post('/start/:streamId', StreamController.start);
router.post('/pause/:streamId', StreamController.pause);
router.post('/resume/:streamId', StreamController.resume);

// חשוב מאוד - ייצוא הראוטר כדי שאינדקס יוכל להשתמש בו
export default router;
