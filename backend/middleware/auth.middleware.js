const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const requireAuth = (req, res, next) => {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: missing token' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: String(payload.sub || ''),
      email: String(payload.email || ''),
      name: String(payload.name || '')
    };
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
};

const signAuthToken = (user) =>
  jwt.sign(
    {
      email: user.email,
      name: user.name
    },
    getJwtSecret(),
    {
      subject: String(user._id),
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );

module.exports = {
  requireAuth,
  signAuthToken
};
