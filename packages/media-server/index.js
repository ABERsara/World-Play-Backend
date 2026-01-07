import express from 'express';
import { spawn } from 'child_process';
import path from 'path';

dotenv.config();
const prisma = new PrismaClient();
const app = express();
const PORT = 8000;
const TEMP_DIR = path.join(process.cwd(), 'media_files');

// 🔧 הוספה חדשה: תמיכה ב-JSON בבקשות
app.use(express.json());

// 🆕 מעקב אחרי שידורים פעילים
// Map זה כמו אובייקט אבל יותר מתאים לניהול דינמי
const activeStreams = new Map();

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use('/hls', express.static(TEMP_DIR));

// 🏠 דף הבית - מציג סטטוס
app.get('/', (req, res) => {
    res.json({
        status: 'active',
        message: 'Media Server is ready',
        activeStreams: activeStreams.size,
        streams: Array.from(activeStreams.keys())
    });
});

/**
 * 📹 התחלת שידור חי
 * השינוי המרכזי: משתמשים ב-append_list במקום delete_segments
 */
app.post('/live/:streamId', async (req, res) => {
    const { streamId } = req.params;
    const streamPath = path.join(TEMP_DIR, streamId);

    // ✋ בדיקה: האם השידור כבר קיים?
    if (activeStreams.has(streamId)) {
        return res.status(409).json({ 
            error: 'Stream already running',
            streamId 
        });
    }

    // יצירת תיקייה
    if (!fs.existsSync(streamPath)) {
        fs.mkdirSync(streamPath, { recursive: true });
    }

    console.log(`📹 Starting stream: ${streamId}`);

    // עדכון Backend
    try {
        await fetch('http://world_play_app_backend:2081/api/streams/start-from-server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streamId, status: 'LIVE' })
        });
        console.log(`✅ Backend: ${streamId} is LIVE`);
    } catch (err) {
        console.error(`❌ Backend notification failed:`, err.message);
    }

    // 🎬 FFmpeg עם הגדרות של סארה
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',              // קלט מ-stdin
        
        // 🎥 וידאו
        '-c:v', 'libx264',           // קודק H.264
        '-preset', 'ultrafast',      // 🚀 הכי מהיר (לזמן אמת)
        '-tune', 'zerolatency',      // 🎯 השהייה מינימלית
        
        // 🔊 אודיו
        '-c:a', 'aac',               // קודק AAC
        
        // 📦 HLS
        '-f', 'hls',
        '-hls_time', '2',            // כל segment = 2 שניות
        '-hls_list_size', '5',       // 5 segments בפלייליסט
        
        // ⭐ זה המפתח של סארה!
        '-hls_flags', 'append_list', // סגמנטים חדשים מתווספים (לא נמחקים!)
        
        '-hls_segment_filename', path.join(streamPath, 'segment%03d.ts'),
        path.join(streamPath, 'index.m3u8')
    ]);

    // 💾 שמירת מידע על השידור ב-Map
    activeStreams.set(streamId, {
        ffmpeg: ffmpeg,              // תהליך ה-FFmpeg
        startTime: Date.now(),       // מתי התחיל
        isPaused: false,             // האם במצב PAUSE
        pauseStartTime: null,        // מתי נכנסנו ל-PAUSE
        segmentsCreated: 0,          // כמה segments נוצרו
        pauseSegments: []            // segments שנוצרו בזמן PAUSE
    });

    // 🌊 העברת הנתונים מהבקשה ל-FFmpeg
    // הזרמת הנתונים עם טיפול בשגיאות כדי למנוע קריסת EPIPE
req.pipe(ffmpeg.stdin).on('error', (err) => {
    console.error(`⚠️ FFmpeg stdin error [${streamId}]:`, err.message);
    // אנחנו לא קורסים, פשוט ממשיכים הלאה
});

    // 📊 מעקב אחרי לוגים של FFmpeg
    ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();
        
        // ספירת segments (למידע בלבד)
        if (output.includes('Opening') && output.includes('.ts')) {
            const stream = activeStreams.get(streamId);
            if (stream) {
                stream.segmentsCreated++;
                
                // אם אנחנו ב-PAUSE, זכור את ה-segment
                if (stream.isPaused) {
                    const match = output.match(/segment(\d+)\.ts/);
                    if (match) {
                        stream.pauseSegments.push(`segment${match[1]}.ts`);
                        console.log(`💾 Pause segment: segment${match[1]}.ts`);
                    }
                }
            }
        }
        
        // הצג רק שגיאות
        if (output.includes('error') || output.includes('Error')) {
            console.error(`⚠️ FFmpeg [${streamId}]:`, output);
        }
    });

    // 🛑 כשהשידור מסתיים
    ffmpeg.on('close', async (code) => {
        const stream = activeStreams.get(streamId);
        const duration = stream ? (Date.now() - stream.startTime) / 1000 : 0;
        
        console.log(`🛑 Stream ${streamId} ended after ${duration.toFixed(1)}s (code: ${code})`);
        
        // עדכון Backend
        try {
            await fetch('http://world_play_app_backend:2081/api/streams/end-from-server', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    streamId, 
                    status: 'FINISHED',
                    duration: Math.floor(duration)
                })
            });
        } catch (err) {
            console.error(`❌ Backend notification failed:`, err.message);
        }
        
        // 🗑️ ניקוי
        cleanupStream(streamId);
        res.end();
    });

    // ⚠️ טיפול בשגיאות
    req.on('error', (err) => {
        console.error(`❌ Request error [${streamId}]:`, err.message);
        cleanupStream(streamId);
    });

    req.on('close', () => {
        console.log(`🔌 Client disconnected [${streamId}]`);
        cleanupStream(streamId);
    });
});

/**
 * ⏸️ PAUSE - סימון שהמשחק עצר
 * 
 * ההבדל מהגישה הקודמת:
 * - אין FFmpeg שני!
 * - ה-FFmpeg הקיים ממשיך לרוץ
 * - אנחנו רק "מסמנים" שאנחנו ב-PAUSE
 * - הסגמנטים ממשיכים להיווצר ונשמרים בזכות append_list
 */
app.post('/live/:streamId/pause', async (req, res) => {
    const { streamId } = req.params;
    const stream = activeStreams.get(streamId);

    // ✋ בדיקות
    if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    if (stream.isPaused) {
        return res.status(400).json({ error: 'Already paused' });
    }

    console.log(`⏸️ PAUSE: ${streamId}`);

    // 📝 עדכון המצב
    stream.isPaused = true;
    stream.pauseStartTime = Date.now();
    stream.pauseStartSegment = stream.segmentsCreated;
    stream.pauseSegments = []; // איפוס רשימת segments של ה-PAUSE

    // 📢 עדכון Backend
    try {
        await fetch('http://world_play_app_backend:2081/api/streams/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streamId, status: 'PAUSED' })
        });
    } catch (err) {
        console.error(`❌ Backend notification failed:`, err.message);
    }

    res.json({
        success: true,
        message: 'Stream marked as paused',
        note: 'FFmpeg continues running and creating segments',
        currentSegment: stream.segmentsCreated,
        approach: 'sara_append_list'
    });
});

/**
 * ▶️ RESUME - המשך משחק
 * 
 * ההבדל מהגישה הקודמת:
 * - אין playlist חדש ליצור!
 * - הכל כבר קיים ב-index.m3u8
 * - הצופים פשוט ממשיכים לקרוא מהפלייליסט
 */
app.post('/live/:streamId/resume', async (req, res) => {
    const { streamId } = req.params;
    const stream = activeStreams.get(streamId);

    // ✋ בדיקות
    if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    if (!stream.isPaused) {
        return res.status(400).json({ error: 'Stream is not paused' });
    }

    console.log(`▶️ RESUME: ${streamId}`);

    // 📊 חישוב כמה זמן עברנו ב-PAUSE
    const pauseDuration = (Date.now() - stream.pauseStartTime) / 1000;
    const segmentsDuringPause = stream.pauseSegments.length;

    console.log(`   ⏱️ Pause duration: ${pauseDuration.toFixed(1)}s`);
    console.log(`   📦 Segments created: ${segmentsDuringPause}`);

    // 📝 עדכון המצב
    stream.isPaused = false;
    stream.pauseStartTime = null;

    // 📢 עדכון Backend
    try {
        await fetch('http://world_play_app_backend:2081/api/streams/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                streamId, 
                status: 'LIVE',
                pauseDuration: Math.floor(pauseDuration)
            })
        });
    } catch (err) {
        console.error(`❌ Backend notification failed:`, err.message);
    }

    res.json({
        success: true,
        message: 'Stream resumed',
        pauseDuration: Math.floor(pauseDuration),
        segmentsDuringPause,
        note: 'Viewers continue reading from same playlist',
        playlistUrl: `/hls/${streamId}/index.m3u8`,
        approach: 'sara_append_list'
    });
});

/**
 * 📊 קבלת סטטוס שידור
 */
app.get('/live/:streamId/status', (req, res) => {
    const { streamId } = req.params;
    const stream = activeStreams.get(streamId);

    if (!stream) {
        return res.status(404).json({ 
            streamId,
            status: 'not_found' 
        });
    }

    const duration = (Date.now() - stream.startTime) / 1000;
    const pauseDuration = stream.isPaused && stream.pauseStartTime
        ? (Date.now() - stream.pauseStartTime) / 1000
        : 0;

    res.json({
        streamId,
        status: stream.isPaused ? 'paused' : 'live',
        duration: Math.floor(duration),
        pauseDuration: Math.floor(pauseDuration),
        segmentsCreated: stream.segmentsCreated,
        pauseSegments: stream.pauseSegments.length,
        playlistUrl: `/hls/${streamId}/index.m3u8`
    });
});

/**
 * 🛑 עצירת שידור ידנית
 */
app.delete('/live/:streamId', async (req, res) => {
    const { streamId } = req.params;

    if (!activeStreams.has(streamId)) {
        return res.status(404).json({ error: 'Stream not found' });
    }

    console.log(`🛑 Manually stopping: ${streamId}`);
    
    // עדכון Backend
    try {
        await fetch('http://world_play_app_backend:2081/api/streams/end-from-server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streamId, status: 'FINISHED' })
        });
    } catch (err) {
        console.error(`❌ Backend notification failed:`, err.message);
    }

    cleanupStream(streamId);
    res.json({ success: true, message: 'Stream stopped' });
});

/**
 * 🗑️ פונקציה לניקוי שידור
 */
function cleanupStream(streamId) {
    const stream = activeStreams.get(streamId);

    if (stream) {
        // עצור את FFmpeg
        if (stream.ffmpeg) {
            try {
                stream.ffmpeg.kill('SIGTERM');
                console.log(`   🛑 FFmpeg process killed`);
            } catch (err) {
                console.error(`   ❌ Error killing FFmpeg:`, err.message);
            }
        }

        // מחק מה-Map
        activeStreams.delete(streamId);
        console.log(`   🗑️ Removed from active streams`);
    }

    // 🗑️ מחיקת קבצים אחרי 10 דקות
    setTimeout(() => {
        const streamPath = path.join(TEMP_DIR, streamId);
        if (fs.existsSync(streamPath)) {
            fs.rmSync(streamPath, { recursive: true, force: true });
            console.log(`   🗑️ Deleted files: ${streamPath}`);
        }
    }, 10 * 60 * 1000);
}

/**
 * 🔄 ניקוי אוטומטי של שידורים ישנים
 * רץ כל 30 דקות
 */
setInterval(() => {
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // שעתיים

    for (const [streamId, stream] of activeStreams.entries()) {
        if (now - stream.startTime > maxAge) {
            console.log(`⏰ Auto-cleanup old stream: ${streamId}`);
            cleanupStream(streamId);
        }
    }
}, 30 * 60 * 1000);

/**
 * 🛑 Graceful shutdown
 * כשעוצרים את השרת, נקה הכל
 */
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, cleaning up...');
    for (const streamId of activeStreams.keys()) {
        cleanupStream(streamId);
    }
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    if (err.code === 'EPIPE') {
        console.log('💡 Ignored EPIPE error (Client disconnected before FFmpeg closed)');
    } else {
        console.error('💥 Uncaught Exception:', err);
        // במקרה של שגיאה אחרת, כדאי לנקות ולסגור מסודר
    }
});

// 🚀 הפעלת השרת
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🎥 Media Server (Sara's Approach)   ║
╚════════════════════════════════════════╝

📡 Port: ${PORT}
📁 Storage: ${TEMP_DIR}
🎬 FFmpeg: Single process with append_list

📚 Endpoints:
  POST   /live/:streamId          → Start streaming
  POST   /live/:streamId/pause    → Mark as paused
  POST   /live/:streamId/resume   → Resume streaming
  GET    /live/:streamId/status   → Get status
  DELETE /live/:streamId          → Stop streaming

✅ Ready to accept streams!
    `);
});
startServer();