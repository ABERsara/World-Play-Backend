import express from 'express';
import streamController from '../controller/stream.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
// למחוק את השורה של ה-StreamController מהמדיה סרבר - זה מה שגרם לקריסה

const router = express.Router();

router.use(authenticateToken);

// יצירת סטרים ועדכון סטטוס ב-DB (פעולות של ה-App Server)
router.post('/', streamController.createStream);
router.put('/:id/status', streamController.updateStatus);
router.post('/:id/pause', streamController.pauseStream);
router.post('/:id/resume', streamController.resumeStream);

// הוספת הראוט הפנימי שעדכנת
router.post('/start-from-server', async (req, res) => {
    const { streamId } = req.body;
    try {
        console.log(`📢 Backend: Received start signal for stream ${streamId}`);
        
        // עדכון הסטטוס בבסיס הנתונים ל-LIVE
        // ודאי ש-prisma מיובא בקובץ הזה או בשימוש דרך ה-Controller
        const updatedStream = await prisma.stream.update({
            where: { id: streamId },
            data: { 
                status: 'LIVE',
                startTime: new Date()
            }
        });

        res.status(200).json({ success: true, stream: updatedStream });
    } catch (error) {
        console.error("❌ Backend Error updating stream:", error.message);
        res.status(500).json({ error: "Failed to update stream status" });
    }
});

export default router;