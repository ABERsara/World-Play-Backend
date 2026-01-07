import express from 'express';
import streamController from '../controller/stream.controller.js';import { authenticateToken } from '../middleware/auth.middleware.js';
const router = express.Router();
router.use(authenticateToken);
router.post('/', streamController.createStream);router.put('/:id/status', streamController.updateStatus);router.post('/:id/pause', streamController.pauseStream);
router.post('/:id/resume', streamController.resumeStream);

router.post('/api/streams/start-from-server', async (req, res) => {
    const { streamId } = req.body;
    
    try {
        console.log(`📢 Backend: Received start signal for stream ${streamId}`);
        
        // עדכון הסטטוס בבסיס הנתונים ל-LIVE
        const updatedStream = await prisma.stream.update({
            where: { id: streamId }, // ודאי שזה ה-ID הנכון
            data: { 
                status: 'LIVE',
                startTime: new Date()
            }
        });

        // כאן אפשר להוסיף שליחת הודעה ב-Socket.io לכל המשתמשים
        // io.emit('stream_started', updatedStream);

        res.status(200).json({ success: true, stream: updatedStream });
    } catch (error) {
        console.error("❌ Backend Error updating stream:", error.message);
        res.status(500).json({ error: "Failed to update stream status" });
    }
});
export default router;