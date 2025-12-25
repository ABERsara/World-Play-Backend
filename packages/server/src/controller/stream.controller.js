import streamService from '../services/stream.service.js';
import gameService from '../services/game.service.js';

// פונקציית עזר: טקסט או מספר -> שניות (Float)
function parseToSeconds(videoTimestamp) {
    if (videoTimestamp === null || videoTimestamp === undefined) return 0;
    if (typeof videoTimestamp === 'number') return videoTimestamp;
    
    if (typeof videoTimestamp === 'string' && videoTimestamp.includes(':')) {
        const [minutes, seconds] = videoTimestamp.split(':').map(Number);
        return (minutes * 60) + (seconds || 0);
    }
    
    return parseFloat(videoTimestamp) || 0;
}

// פונקציית עזר: שניות (Float) -> טקסט "MM:SS"
function secondsToTime(seconds) {
    if (!seconds || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const streamController = {
    // POST /api/streams
    async createStream(req, res) {
        try {
            const userId = req.user.id;
            const { title } = req.body;

            if (!title) {
                return res.status(400).json({ error: 'חובה לספק כותרת (title) לסטרים' });
            }

            const stream = await streamService.createStream(userId, { title });
            res.status(201).json({ message: 'הסטרים נוצר בהצלחה', stream });
        } catch (error) {
            console.error('Create Stream Error:', error);
            res.status(500).json({ error: 'שגיאה ביצירת הסטרים' });
        }
    },

    // PATCH /api/streams/:id/status
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            let { status, videoTimestamp } = req.body;
            const userId = req.user.id;

            if (status) status = status.trim().toUpperCase();

            const validStatuses = ['WAITING', 'ACTIVE', 'FINISHED', 'LIVE', 'PAUSE'];
            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({ error: `סטטוס לא תקין: ${status}` });
            }

            const seconds = parseToSeconds(videoTimestamp);

            let result;
            const io = req.app.get('io');

            if (status === 'LIVE' || status === 'PAUSE') {
                result = await streamService.updateStreamStatus(id, userId, status, seconds);
                
                if (io) {
                    const eventName = status === 'PAUSE' ? 'stream_paused' : 'status_update';
                    io.to(id).emit(eventName, {
                        id,
                        status,
                        videoTimestamp: seconds,
                        displayTime: secondsToTime(seconds)
                    });
                }
            } else {
                result = await gameService.updateGameStatus(id, userId, status);
                if (io) io.to(id).emit('status_update', { id, status });
            }

            res.status(200).json({ 
                message: 'הסטטוס עודכן בהצלחה', 
                videoTimestamp: secondsToTime(seconds), // מחזיר למשל "02:45"
                data: result 
            });
        } catch (error) {
            console.error('Update Status Error:', error);
            res.status(500).json({ error: error.message || 'שגיאה בעדכון הסטטוס' });
        }
    },

    // POST /api/streams/:id/pause
    async pauseStream(req, res) {
        try {
            const { id } = req.params;
            const { videoTimestamp } = req.body;
            
            const seconds = parseToSeconds(videoTimestamp);
            const result = await streamService.pauseStream(id, seconds);

            const io = req.app.get('io');
            if (io) {
                io.to(id).emit('stream_paused', {
                    streamId: id,
                    videoTimestamp: seconds,
                    displayTime: secondsToTime(seconds),
                    status: 'PAUSE'
                });
            }

            res.status(200).json({ 
                message: 'הסטרים הושהה', 
                videoTimestamp: secondsToTime(seconds), // מחזיר למשל "02:45"
                data: result 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/streams/:id/resume
    async resumeStream(req, res) {
        try {
            const { id } = req.params;
            const updatedStream = await streamService.resumeStream(id);
            
            const formattedTime = secondsToTime(updatedStream.lastTimestamp);

            const io = req.app.get('io');
            if (io) {
                io.to(id).emit('stream_resumed', { 
                    streamId: id,
                    status: 'LIVE',
                    videoTimestamp: updatedStream.lastTimestamp,
                    displayTime: formattedTime
                });
            }

            res.status(200).json({
                message: 'השידור חודש',
                videoTimestamp: formattedTime, // מחזיר "02:45"
                data: updatedStream
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
};

export default streamController;