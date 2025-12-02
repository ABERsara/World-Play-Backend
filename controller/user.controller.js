import userService from '../services/user.service.js';

const userController = {
  async register(req, res) {
    try {
      const { name, username, email, password } = req.body;

      const finalName = name || username;

      if (!finalName || !username || !email || !password) {
        return res
          .status(400)
          .json({ error: 'שם מלא, שם משתמש, אימייל וסיסמה נדרשים.' });
      }

      const user = await userService.createUser(
        finalName,
        username,
        email,
        password
      );

      return res.status(201).json({ message: 'המשתמש נוצר בהצלחה.', user });
    } catch (error) {
      console.error('שגיאת רישום:', error.message);
      const statusCode = error.message.includes('קיים') ? 409 : 500;
      return res
        .status(statusCode)
        .json({ error: error.message || 'שגיאת שרת פנימית.' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const { token, user } = await userService.authenticateUser(
        email,
        password
      );

      return res.status(200).json({ token, user });
    } catch (error) {
      const statusCode = error.message.includes('שגויים') ? 401 : 500;
      return res
        .status(statusCode)
        .json({ error: error.message || 'שגיאת התחברות.' });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await userService.getUserById(req.user.userId);
      return res.status(200).json(user);
    } catch (error) {
      console.error(error);
      return res.status(404).json({ error: 'המשתמש לא נמצא.' });
    }
  },
};

export default userController;
