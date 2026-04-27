import economyService from '../services/economy.service.js';
import { syncUserBalances } from '../utils/balanceSync.js';

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

      // סנכרון Real-time לכל הצדדים
      const io = req.app.get('io');
      if (io) {
        await syncUserBalances(io, senderId, gameId);
        await syncUserBalances(io, receiverPlayerId, gameId);
        await syncUserBalances(io, moderatorId, gameId);
      }

      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  },
};

export default economyController;
