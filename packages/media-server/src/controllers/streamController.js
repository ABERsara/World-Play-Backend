import { StreamService } from '../services/streamService.js';

export const StreamController = {
    async start(req, res) {
        const { streamId } = req.params;
        
        if (StreamService.getActiveStreams().has(streamId)) {
            return res.status(409).json({ error: 'Stream already running' });
        }

        try {
            // אנחנו מעבירים את res כדי שנוכל לסגור אותו רק כשהשידור באמת מסתיים
            await StreamService.startStream(streamId, req, res);
            
            console.log(`📹 Stream input connected: ${streamId}`);
            
            // טיפול בניתוק פתאומי של המקור
            req.on('close', () => {
                console.log(`🔌 Source disconnected for stream: ${streamId}`);
            });

        } catch (error) {
            console.error(`❌ Controller error: ${error.message}`);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    },

    async pause(req, res) {
        const { streamId } = req.params;
        const stream = StreamService.getActiveStreams().get(streamId);
        if (!stream) return res.status(404).json({ error: 'Not found' });

        stream.isPaused = true;
        res.json({ success: true, message: 'Paused' });
    },

    async resume(req, res) {
        const { streamId } = req.params;
        const stream = StreamService.getActiveStreams().get(streamId);
        if (!stream || !stream.isPaused) return res.status(400).json({ error: 'Cannot resume' });

        stream.isPaused = false;
        res.json({ success: true, message: 'Resumed' });
    }
};