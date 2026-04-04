const express = require('express');
const bcrypt = require('bcryptjs');
const FamilyUser = require('../models/FamilyUser');
const { requireAuth, signAuthToken } = require('../middleware/auth.middleware');

const router = express.Router();
const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);

const toPublicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  created_at: user.created_at
});

router.post('/signup', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await FamilyUser.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await FamilyUser.create({ name, email, password_hash });
    const token = signAuthToken(user);

    return res.status(201).json({ token, user: toPublicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await FamilyUser.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signAuthToken(user);
    return res.json({ token, user: toPublicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await FamilyUser.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
