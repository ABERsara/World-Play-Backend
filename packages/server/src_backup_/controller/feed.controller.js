import feedService from '../services/feed.service.js';

export const getLiveFeed = async (req, res) => {
  try {
    const userId = req.user.id;

    // קריאה לשירות כדי לקבל את הנתונים
    // אנו מעבירים את ה-userId למקרה שנצטרך אותו בלוגיקה (גם אם כרגע לא משתמשים בו)
    const liveStreams = await feedService.fetchActiveStreams(userId);

    res.status(200).json(liveStreams);
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
};
