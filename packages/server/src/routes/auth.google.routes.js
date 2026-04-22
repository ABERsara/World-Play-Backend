import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// שלב א — הפניה לגוגל
router.get(
  '/',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// שלב ב — גוגל מחזירה את המשתמש
router.get(
  '/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, role: req.user.role, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.redirect(`client://auth-success?token=${token}`);
  }
);

export default router;
