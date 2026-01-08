import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import streamRoutes from './src/routes/streamRoutes.js';
import { StreamService } from './src/services/streamService.js';

dotenv.config();
const app = express();

// חשוב: לאפשר JSON לפני הראוטים
app.use(express.json());

// הגשת קבצים סטטיים של HLS
app.use('/hls', express.static(StreamService.getTempDir()));

// חיבור הראוטר (שימי לב לנתיב /live)
app.use('/live', streamRoutes);

const PORT = process.env.MEDIA_PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Media Server is running!
📡 Port: ${PORT}
📁 Static files: http://localhost:${PORT}/hls
    `);
});