const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Call = require('../models/Call');
const Elder = require('../models/Elder');
const { getMemoryContext } = require('../services/memory.service');
const { placeCall } = require('../services/twilio-voice.service');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const calls = await Call.find().sort({ created_at: -1 }).limit(100).lean();
    res.json(calls);
  } catch (error) {
    next(error);
  }
});

router.get('/elder/:elderId', async (req, res, next) => {
  try {
    const calls = await Call.find({ elder_id: req.params.elderId }).sort({ created_at: -1 }).limit(50).lean();
    res.json(calls);
  } catch (error) {
    next(error);
  }
});

router.post('/trigger/:elderId', async (req, res, next) => {
  try {
    const elder = await Elder.findById(req.params.elderId);
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
      started_at: new Date(),
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

module.exports = router;