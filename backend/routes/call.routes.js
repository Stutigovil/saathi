const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Call = require('../models/Call');
const CallReminder = require('../models/CallReminder');
const Elder = require('../models/Elder');
const { getMemoryContext } = require('../services/memory.service');
const { placeCall } = require('../services/twilio-voice.service');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

const isValidISODateTime = (value) => {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

router.get('/', async (req, res, next) => {
  try {
    const elders = await Elder.find({ created_by: req.user.id }).select('_id').lean();
    const elderIds = elders.map((item) => item._id);
    const calls = await Call.find({ elder_id: { $in: elderIds } }).sort({ created_at: -1 }).limit(100).lean();
    res.json(calls);
  } catch (error) {
    next(error);
  }
});

router.get('/elder/:elderId', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.elderId, created_by: req.user.id }).lean();
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    const calls = await Call.find({ elder_id: req.params.elderId }).sort({ created_at: -1 }).limit(50).lean();
    res.json(calls);
  } catch (error) {
    next(error);
  }
});

router.post('/trigger/:elderId', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.elderId, created_by: req.user.id });
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    await getMemoryContext(elder._id);
    const twilioCall = await placeCall(elder);
    const providerCallId = twilioCall.sid || `twilio-${uuidv4()}`;

    const call = await Call.create({
      elder_id: elder._id,
      provider_call_id: providerCallId,
      vapi_call_id: providerCallId,
      status: 'calling',
      attempt_number: 1,
      transcript: '',
      exchange_count: 0,
      armoriq_blocks: [],
      family_alert_sent: false,
      created_at: new Date()
    });

    return res.status(201).json({
      message: 'Call triggered successfully',
      call,
      twilio: {
        sid: twilioCall.sid,
        status: twilioCall.status
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/reminders/:elderId', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.elderId, created_by: req.user.id }).lean();
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    const reminders = await CallReminder.find({ elder_id: req.params.elderId, created_by: req.user.id })
      .sort({ scheduled_for: -1, created_at: -1 })
      .limit(50)
      .lean();

    return res.json(reminders);
  } catch (error) {
    return next(error);
  }
});

router.post('/reminders/:elderId', async (req, res, next) => {
  try {
    const elder = await Elder.findOne({ _id: req.params.elderId, created_by: req.user.id }).lean();
    if (!elder) {
      return res.status(404).json({ message: 'Elder not found' });
    }

    const callType = String(req.body.call_type || 'followup').trim().toLowerCase();
    const scheduledForRaw = String(req.body.scheduled_for || '').trim();
    const contextTopic = String(req.body.context_topic || '').trim();
    const contextNotes = String(req.body.context_notes || '').trim();

    if (!['reminder', 'followup'].includes(callType)) {
      return res.status(400).json({ message: 'call_type must be reminder or followup.' });
    }

    if (!isValidISODateTime(scheduledForRaw)) {
      return res.status(400).json({ message: 'scheduled_for must be a valid datetime.' });
    }

    if (!contextTopic) {
      return res.status(400).json({ message: 'context_topic is required.' });
    }

    const scheduledFor = new Date(scheduledForRaw);
    if (scheduledFor.getTime() < Date.now() + 30 * 1000) {
      return res.status(400).json({ message: 'scheduled_for must be at least 30 seconds in the future.' });
    }

    const reminder = await CallReminder.create({
      elder_id: elder._id,
      created_by: req.user.id,
      call_type: callType,
      scheduled_for: scheduledFor,
      context_topic: contextTopic,
      context_notes: contextNotes,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    return res.status(201).json({
      message: `${callType === 'reminder' ? 'Reminder' : 'Follow-up'} call scheduled successfully.`,
      reminder
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/reminders/:reminderId/cancel', async (req, res, next) => {
  try {
    const reminder = await CallReminder.findOne({ _id: req.params.reminderId, created_by: req.user.id });
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    if (['triggered', 'completed', 'failed'].includes(reminder.status)) {
      return res.status(409).json({ message: `Cannot cancel a ${reminder.status} reminder.` });
    }

    reminder.status = 'cancelled';
    reminder.updated_at = new Date();
    await reminder.save();

    return res.json({ message: 'Reminder cancelled.', reminder });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;