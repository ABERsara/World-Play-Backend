import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';

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

dotenv.config();

const app = express();
// מוגדר כ-server
const server = http.createServer(app);

// הגדרת פורט
const PORT = process.env.PORT || 8080;

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

app.get('/', (req, res) => {
  res.send('Live Game Streaming Backend is Running!');
});

// אנחנו שולחים את ה-server שיצרנו כדי שהסוקט "ירכב" עליו
const io = initializeSocketIO(server);

// הופכים את io לזמין בכל הראוטרים (למשל: req.app.get('io'))
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
