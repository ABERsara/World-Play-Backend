import express from 'express';
import { spawn } from 'child_process'; // כלי להרצת פקודות חיצוניות (כמו FFmpeg)
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 8000;
const TEMP_DIR = '/tmp/media'; // התיקייה שמיפינו בדוקר

// ודואים שהתיקייה קיימת
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.get('/', (req, res) => {
    res.send('Media Server is active and ready for streaming');
});
// Endpoint לקבלת שידור חי
app.post('/live/:streamId', (req, res) => {
    const { streamId } = req.params;
    const streamPath = path.join(TEMP_DIR, streamId);

    // 1. יצירת תיקייה ייחודית לשידור הזה
    if (!fs.existsSync(streamPath)) {
        fs.mkdirSync(streamPath, { recursive: true });
    }

    console.log(`📹 Starting stream processing for: ${streamId}`);

    // 2. הגדרת פקודת FFmpeg
    // הפקודה הזו לוקחת וידאו מה-stdin (הקלט של השרת) והופכת אותו ל-HLS
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',             // קבלת קלט מהצינור (stdin)
        '-c:v', 'libx264',         // קידוד וידאו סטנדרטי
        '-preset', 'veryfast',      // מהירות עיבוד מקסימלית
        '-f', 'hls',               // פורמט יציאה: HLS
        '-hls_time', '2',          // כל מקטע (Segment) יהיה באורך 2 שניות
        '-hls_list_size', '5',     // לשמור רק את 5 המקטעים האחרונים בפלייליסט
        '-hls_flags', 'delete_segments', // למחוק מקטעים ישנים כדי לא למלא את הדיסק
        path.join(streamPath, 'index.m3u8') // קובץ הפלייליסט הסופי
    ]);

    // 3. הזרמת הנתונים מהבקשה (req) ישירות לתוך FFmpeg
    req.pipe(ffmpeg.stdin);

    ffmpeg.stderr.on('data', (data) => {
        // כאן FFmpeg מדפיס לוגים של העיבוד (אפשר להשתיק אם זה יותר מדי)
        // console.log(`FFmpeg [${streamId}]:`, data.toString());
    });

    ffmpeg.on('close', (code) => {
        console.log(`🛑 Stream ${streamId} ended with code ${code}`);
        res.end();
    });

    req.on('error', (err) => {
        console.error(`❌ Request error on stream ${streamId}:`, err);
        ffmpeg.kill();
    });
});
// כאן נוסיף בהמשך את ה-Endpoint שיקבל את הוידאו
app.listen(PORT, () => {
    console.log(`🚀 Media Server running on port ${PORT}`);
});