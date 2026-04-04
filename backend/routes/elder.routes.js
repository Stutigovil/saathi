const express = require('express');
const multer = require('multer');
const Elder = require('../models/Elder');
const { createVoiceClone } = require('../services/elevenlabs.service');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res, next) => {
  try {
    const elders = await Elder.find().sort({ created_at: -1 }).lean();
    res.json(elders);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const elder = await Elder.findById(req.params.id).lean();
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
    const elder = await Elder.create(req.body);
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
    const elder = await Elder.findByIdAndUpdate(
      req.params.id,
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
    const elder = await Elder.findByIdAndUpdate(
      req.params.id,
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

router.post('/:id/voice-clone', upload.single('file'), async (req, res, next) => {
  try {
    const elder = await Elder.findById(req.params.id);
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Voice sample file is required.' });
    }

    if (!['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'].includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Unsupported audio format. Use .mp3 or .wav.' });
    }

    const voiceName = String(req.body.name || `${elder.name}-voice`).trim() || 'UserVoice';

    try {
      const voiceId = await createVoiceClone({
        name: voiceName,
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname,
        contentType: req.file.mimetype
      });

      console.info(`Voice clone result: elder=${elder._id} voice_id=${voiceId || 'none'}`);

      if (!voiceId) {
        return res.status(200).json({
          message: 'Voice cloning failed. Using default voice.',
          voice_id: elder.voice_id || null,
          fallback: true
        });
      }

      elder.voice_id = voiceId;
      elder.voice_name = voiceName;
      elder.updated_at = new Date();
      await elder.save();

      console.info(`Voice clone stored: elder=${elder._id} voice_id=${elder.voice_id}`);

      return res.status(201).json({
        message: 'Voice cloned successfully.',
        voice_id: voiceId,
        voice_name: voiceName
      });
    } catch (error) {
      console.error('Voice cloning failed:', error?.message || error);
      return res.status(200).json({
        message: 'Voice cloning failed. Using default voice.',
        voice_id: elder.voice_id || null,
        fallback: true
      });
    }
  } catch (error) {
    return next(error);
  }
});

module.exports = router;