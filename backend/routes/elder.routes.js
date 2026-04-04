const express = require('express');
const Elder = require('../models/Elder');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const elders = await Elder.find({ created_by: req.user.id }).sort({ created_at: -1 }).lean();
    res.json(elders);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.id, created_by: req.user.id }).lean();
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }
    return res.json(elder);
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const elder = await Elder.create({
      ...req.body,
      created_by: req.user.id
    });
    res.status(201).json(elder);
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.phone) {
      return res.status(409).json({ message: 'An elder with this phone number already exists.' });
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const elder = await Elder.findOneAndUpdate(
      { _id: req.params.id, created_by: req.user.id },
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    return res.json(elder);
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.phone) {
      return res.status(409).json({ message: 'An elder with this phone number already exists.' });
    }
    return next(error);
  }
});

router.patch('/:id/active', async (req, res, next) => {
  try {
    const elder = await Elder.findOneAndUpdate(
      { _id: req.params.id, created_by: req.user.id },
      { is_active: Boolean(req.body.is_active), updated_at: new Date() },
      { new: true }
    );

    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    return res.json(elder);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;