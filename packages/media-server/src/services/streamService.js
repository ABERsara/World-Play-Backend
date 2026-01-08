import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const TEMP_DIR = '/usr/src/app/packages/media-server/media_files';

// ✅ הגדרת activeStreams!
const activeStreams = new Map();

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const StreamService = {
    getActiveStreams: () => activeStreams,
    getTempDir: () => TEMP_DIR,

    async startStream(streamId, inputPipe, res) {
        // ✅ בדיקה אם השידור כבר קיים
        if (activeStreams.has(streamId)) {
            throw new Error('Stream already exists');
        }

        const streamPath = path.join(TEMP_DIR, streamId);
        
        if (!fs.existsSync(streamPath)) {
            fs.mkdirSync(streamPath, { recursive: true });
        }

        console.log(`🎬 Creating files in: ${streamPath}`);

        const ffmpeg = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-c:v', 'libx264', 
            '-preset', 'ultrafast', 
            '-tune', 'zerolatency',
            '-c:a', 'aac',
            '-f', 'hls', 
            '-hls_time', '2', 
            '-hls_list_size', '5',
            '-hls_flags', 'append_list',
            '-hls_segment_filename', path.join(streamPath, 'segment%03d.ts'),
            path.join(streamPath, 'index.m3u8')
        ]);

        // ✅ שמירה ב-Map
        activeStreams.set(streamId, {
            ffmpeg,
            startTime: Date.now(),
            isPaused: false
        });

        // חיבור הזרימה
        inputPipe.pipe(ffmpeg.stdin);

        // לוגים
        ffmpeg.stderr.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Opening') && output.includes('.ts')) {
                console.log(`📦 FFmpeg: New segment for ${streamId}`);
            }
            if (output.includes('error')) {
                console.error(`⚠️ FFmpeg error [${streamId}]:`, output);
            }
        });

        // סיום שידור
        ffmpeg.on('close', (code) => {
            console.log(`🛑 Stream ${streamId} closed (code: ${code})`);
            activeStreams.delete(streamId);
            
            if (res && !res.headersSent) {
                res.end();
            }
        });

        // טיפול בשגיאות
        inputPipe.on('error', (err) => {
            console.error(`❌ Input pipe error [${streamId}]:`, err.message);
            if (ffmpeg && !ffmpeg.killed) {
                ffmpeg.kill('SIGTERM');
            }
            activeStreams.delete(streamId);
        });
    },

    stopStream(streamId) {
        const stream = activeStreams.get(streamId);
        if (stream && stream.ffmpeg) {
            stream.ffmpeg.kill('SIGTERM');
            activeStreams.delete(streamId);
            console.log(`🛑 Manually stopped: ${streamId}`);
        }
    }
};