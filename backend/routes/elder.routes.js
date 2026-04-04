const express = require('express');
const Elder = require('../models/Elder');
const { requireAuth } = require('../middleware/auth.middleware');
const { cloneVoiceFromAudio, getDefaultVoiceId } = require('../services/elevenlabs.service');

const router = express.Router();
router.use(requireAuth);

const isValidHHMM = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ''));
const MAX_CLONE_AUDIO_BYTES = Number(process.env.MAX_CLONE_AUDIO_BYTES || 8 * 1024 * 1024);
const MIN_CLONE_AUDIO_BYTES = Number(process.env.MIN_CLONE_AUDIO_BYTES || 12000);
const SUPPORTED_CLONE_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/m4a',
  'audio/webm',
  'audio/ogg'
]);

const parseAudioPayload = (audioInput) => {
  const raw = String(audioInput || '').trim();
  if (!raw) return null;

  const dataUrlMatch = raw.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i);
  if (dataUrlMatch) {
    return {
      mimeType: String(dataUrlMatch[1] || '').toLowerCase(),
      buffer: Buffer.from(dataUrlMatch[2], 'base64')
    };
  }

  return {
    mimeType: 'audio/webm',
    buffer: Buffer.from(raw, 'base64')
  };
};

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

router.patch('/:id/schedule', async (req, res, next) => {
  try {
    const schedule_time = String(req.body.schedule_time || '').trim();
    const schedule_days = Array.isArray(req.body.schedule_days)
      ? req.body.schedule_days.map((day) => String(day || '').trim()).filter(Boolean)
      : undefined;

    if (!isValidHHMM(schedule_time)) {
      return res.status(400).json({ message: 'schedule_time must be in HH:MM 24-hour format.' });
    }

    const updatePayload = {
      schedule_time,
      updated_at: new Date()
    };

    if (schedule_days) {
      updatePayload.schedule_days = schedule_days;
    }

    if (typeof req.body.is_active === 'boolean') {
      updatePayload.is_active = req.body.is_active;
    }

    const elder = await Elder.findOneAndUpdate(
      { _id: req.params.id, created_by: req.user.id },
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    return res.json(elder);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/voice-clone', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.id, created_by: req.user.id });
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    const voiceName = String(req.body.voice_name || '').trim();
    const fileName = String(req.body.file_name || '').trim() || 'voice-sample.webm';
    const mimeType = String(req.body.mime_type || '').trim() || 'audio/webm';
    const parsedAudio = parseAudioPayload(req.body.audio_base64);

    if (!parsedAudio?.buffer?.length) {
      return res.status(400).json({ message: 'audio_base64 is required for voice cloning.' });
    }

    if (parsedAudio.buffer.length < MIN_CLONE_AUDIO_BYTES) {
      return res.status(400).json({ message: 'Recording too short. Please record at least 6-10 seconds of clear voice.' });
    }

    if (parsedAudio.buffer.length > MAX_CLONE_AUDIO_BYTES) {
      return res.status(400).json({ message: 'Audio file is too large. Please upload a shorter recording.' });
    }

    const effectiveMimeType = String(mimeType || parsedAudio.mimeType || '')
      .toLowerCase()
      .split(';')[0]
      .trim();

    if (effectiveMimeType && !SUPPORTED_CLONE_MIME_TYPES.has(effectiveMimeType)) {
      return res.status(400).json({
        message: `Unsupported audio format (${effectiveMimeType}). Use mp3, wav, m4a, webm, or ogg.`
      });
    }

    const cloned = await cloneVoiceFromAudio({
      name: voiceName || `${elder.name} Voice`,
      audioBuffer: parsedAudio.buffer,
      fileName,
      mimeType: effectiveMimeType || 'audio/webm'
    });

    if (!cloned?.voice_id) {
      return res.status(502).json({ message: 'Voice cloning did not return a valid voice id.' });
    }

    elder.voice_id = cloned.voice_id;
    elder.voice_name = cloned.name || voiceName || `${elder.name} Voice`;
    elder.updated_at = new Date();
    await elder.save();

    return res.json({
      message: 'Voice cloned successfully.',
      elder,
      voice: {
        voice_id: elder.voice_id,
        voice_name: elder.voice_name
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id/voice-clone', async (req, res, next) => {
  try {
    const elder = await Elder.findOneAndUpdate(
      { _id: req.params.id, created_by: req.user.id },
      { voice_id: '', voice_name: '', updated_at: new Date() },
      { new: true }
    );

    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    return res.json({
      message: `Voice reset to default (${getDefaultVoiceId()}).`,
      elder
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;