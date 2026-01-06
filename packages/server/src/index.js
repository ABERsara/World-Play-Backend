import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import axios from 'axios';

// ייבוא נתיבי REST
import userRoutes from './routes/user.routes.js';
import financeRoutes from './routes/finance.routes.js';
import streamRoutes from './routes/stream.routes.js';
import gameRoutes from './routes/games.routes.js';
import questionRoutes from './routes/question.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import chatRoutes from './routes/chat.router.js';
import notificationRoutes from './routes/notification.routes.js';
import corsOptions from './config/corsOptions.js';

// ייבוא שירות הסוקט
import { initializeSocketIO } from './services/socket.service.js';

import path from 'path';
import { fileURLToPath } from 'url';

// הגדרת נתיבים (בגלל שאת ב-ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... (אחרי יצירת ה-app)
const app = express();

// הוספי את השורה הזו: הגדרת התיקייה public כסטטית
app.use(express.static(path.join(__dirname, '../public')));
app.use('/libs', express.static(path.join(__dirname, '../node_modules')));
dotenv.config();

// מוגדר כ-server
const server = http.createServer(app);

// הגדרת פורט
const PORT = process.env.PORT || 2081;

// --- Middleware ---
app.use(express.json());
// שימוש ב-corsOptions המיובא
app.use(cors(corsOptions));

// --- Routes (REST API) ---
app.use('/api/users', userRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// 2. הפונקציה לבדיקת שרת המדיה
async function checkMediaServer() {
  try {
    //משתמשים בשם השירות בדוקר ב:'media-server' 
    const response = await axios.get('http://media-server:8000/'); 
    console.log('🔗 [BACKEND-TO-MEDIA] Connection successful:', response.data.status);
  } catch (error) {
    console.log('⚠️ [BACKEND-TO-MEDIA] Warning: Media server is not responding yet.');
  }
}

// 3. הנתיב עבור הלקוח לקבלת קונפיגורציית שרת המדיה
app.get('/api/config/media-server', (req, res) => {
  res.json({
    url: process.env.NEXT_PUBLIC_MEDIA_SERVER_URL || 'http://localhost:8000',
    status: 'active'
  });
});

// אתחול הסוקט וכו'
const io = initializeSocketIO(server);
app.set('io', io);

server.listen(PORT, async () => {
    console.log(`✅ Server is running on port ${PORT}`);
    
    await checkMediaServer();
});