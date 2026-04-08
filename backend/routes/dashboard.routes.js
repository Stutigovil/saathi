const express = require('express');
const { startOfWeek } = require('date-fns');
const Elder = require('../models/Elder');
const Memory = require('../models/Memory');
const Call = require('../models/Call');
const Alert = require('../models/Alert');
const ArmorIQBlock = require('../models/ArmorIQBlock');
const { getMoodTrend } = require('../services/memory.service');
const { getDefaultVoiceId } = require('../services/elevenlabs.service');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'dashboard-routes',
    timestamp: new Date().toISOString()
  });
});

router.get('/elder/:id', async (req, res, next) => {
  try {
    const elderId = req.params.id;
    const elder = await Elder.findOne({ _id: elderId, created_by: req.user.id }).lean();
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    const [memories, moodTrend, calls, armoriqCount, alerts] = await Promise.all([
      Memory.find({ elder_id: elderId }).sort({ date: -1 }).limit(7).lean(),
      getMoodTrend(elderId, 7),
      Call.find({ elder_id: elderId }).sort({ created_at: -1 }).limit(3).lean(),
      ArmorIQBlock.countDocuments({ elder_id: elderId }),
      Alert.find({ elder_id: elderId }).sort({ sent_at: -1 }).limit(20).lean()
    ]);

    return res.json({
      elder,
      memories,
      mood_trend: moodTrend,
      last_calls: calls,
      armoriq_blocks_count: armoriqCount,
      alert_history: alerts,
      tts_defaults: {
        voice_id: getDefaultVoiceId()
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/mood-trend/:id', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.id, created_by: req.user.id }).lean();
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    const days = Number(req.query.days || 7);
    const trend = await getMoodTrend(req.params.id, days);
    return res.json(trend);
  } catch (error) {
    return next(error);
  }
});

router.get('/armoriq-log/:id', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.id, created_by: req.user.id }).lean();
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    const blocks = await ArmorIQBlock.find({ elder_id: req.params.id }).sort({ timestamp: -1 }).limit(50).lean();
    return res.json(blocks);
  } catch (error) {
    return next(error);
  }
});

router.get('/weekly-stats/:id', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.id, created_by: req.user.id }).lean();
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const elderId = req.params.id;

    const [callsThisWeek, memories] = await Promise.all([
      Call.countDocuments({
        elder_id: elderId,
        created_at: { $gte: weekStart },
        status: 'completed'
      }),
      Memory.find({ elder_id: elderId, date: { $gte: weekStart } }).lean()
    ]);

    const averageMood = memories.length
      ? Number((memories.reduce((sum, item) => sum + Number(item.mood_score || 0), 0) / memories.length).toFixed(2))
      : 0;
    const distressCount = memories.filter((item) => item.distress_detected).length;

    return res.json({
      calls_this_week: callsThisWeek,
      average_mood: averageMood,
      distress_events: distressCount
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;