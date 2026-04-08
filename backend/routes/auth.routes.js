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
  family_profile: user.family_profile || {
    member_name: '',
    relationship_with_elder: '',
    phone: '',
    whatsapp: '',
    platform_reason: ''
  },
  profile_completed: Boolean(user.profile_completed),
  created_at: user.created_at
});

const sanitizeFamilyProfileInput = (payload) => {
  const member_name = String(payload?.member_name || '').trim();
  const relationship_with_elder = String(payload?.relationship_with_elder || '').trim();
  const phone = String(payload?.phone || '').trim();
  const whatsapp = String(payload?.whatsapp || '').trim();
  const platform_reason = String(payload?.platform_reason || '').trim();

  return {
    member_name,
    relationship_with_elder,
    phone,
    whatsapp,
    platform_reason
  };
};

const isFamilyProfileComplete = (profile) => {
  return Boolean(
    String(profile?.member_name || '').trim() &&
      String(profile?.relationship_with_elder || '').trim() &&
      String(profile?.phone || '').trim() &&
      String(profile?.whatsapp || '').trim() &&
      String(profile?.platform_reason || '').trim()
  );
};

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

    const familyProfile = sanitizeFamilyProfileInput(req.body.family_profile || {});
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await FamilyUser.create({
      name,
      email,
      password_hash,
      family_profile: familyProfile,
      profile_completed: isFamilyProfileComplete(familyProfile)
    });
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

router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const user = await FamilyUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const incomingName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (incomingName) {
      if (incomingName.length < 2) {
        return res.status(400).json({ message: 'Name must be at least 2 characters.' });
      }
      user.name = incomingName;
    }

    const familyProfile = sanitizeFamilyProfileInput(req.body.family_profile || user.family_profile || {});
    user.family_profile = familyProfile;
    user.profile_completed = isFamilyProfileComplete(familyProfile);

    await user.save();
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/password', requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.current_password || '');
    const newPassword = String(req.body.new_password || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'current_password and new_password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password.' });
    }

    const user = await FamilyUser.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
