// ניהול קשרי עוקבים בין משתמשים — בסיס לפיד ולחיפוש חברתי
import followService from '../services/follow.service.js';

const followController = {
  followUser: async (req, res) => {
    try {
      const followerId = req.user.id;
      const { followingId } = req.body;

      const result = await followService.followUser(followerId, followingId);

      return res.status(200).json({
        success: true,
        message: 'Successfully followed user',
        data: result,
      });
    } catch (error) {
      console.error('[FOLLOW_ERROR]', error.message);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  getFollowers: async (req, res) => {
    try {
      const userId = req.user.id;
      const followers = await followService.getMyFollowers(userId);

      return res.status(200).json({
        success: true,
        count: followers.length,
        data: followers,
      });
    } catch (error) {
      console.error('[GET_FOLLOWERS_ERROR]', error.message);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת רשימת העוקבים',
      });
    }
  },

  unfollowUser: async (req, res) => {
    try {
      const followerId = req.user.id;
      const { followingId } = req.body;

      await followService.unfollowUser(followerId, followingId);

      return res.status(200).json({
        success: true,
        message: 'Successfully unfollowed user',
      });
    } catch (error) {
      console.error('[UNFOLLOW_ERROR]', error.message);
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },
};

export default followController;
