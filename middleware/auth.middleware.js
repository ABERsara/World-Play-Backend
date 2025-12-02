import jwt from 'jsonwebtoken';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error(
      'CONFIGURATION ERROR: JWT_SECRET is not defined in the environment.'
    );
    throw new Error('Missing JWT Secret');
  }
  return secret;
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'נדרשת אימות (טוקן חסר).' });
  }

  try {
    const secret = getSecret();

    jwt.verify(token, secret, (err, userPayload) => {
      if (err) {
        return res
          .status(403)
          .json({ error: 'טוקן אימות לא חוקי או פג תוקף.' });
      }

      req.user = userPayload;
      next();
    });
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res
      .status(500)
      .json({ error: 'Configuration Error: Server is missing JWT Secret.' });
  }
};
