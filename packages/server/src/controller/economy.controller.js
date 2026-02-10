import economyService from '../services/economy.service.js';

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
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  },
};

export default economyController;
