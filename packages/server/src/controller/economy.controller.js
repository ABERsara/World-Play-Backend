import economyService from '../services/economy.service.js';
import { syncUserBalances } from '../utils/balanceSync.js'; // ייבוא פונקציית הסנכרון

const economyController = {
  async sendGift(req, res) {
    try {
      const { senderId, receiverPlayerId, moderatorId, giftValue, gameId } =
        req.body;

      const result = await economyService.sendGift(
        senderId,
        receiverPlayerId,
        moderatorId,
        giftValue,
        gameId
      );

      // --- סנכרון Real-time לכל הצדדים ---
      const io = req.app.get('io');
      if (io) {
        // 1. סנכרון לשולח (הפחתת יתרה)
        await syncUserBalances(io, senderId, gameId);
        // 2. סנכרון למקבל (תוספת יתרה + עדכון ניקוד 35%)
        await syncUserBalances(io, receiverPlayerId, gameId);
        // 3. סנכרון למנחה (עמלת 65%)
        await syncUserBalances(io, moderatorId, gameId);
      }

      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  },
};

export default economyController;
