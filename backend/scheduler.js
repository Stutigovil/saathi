const cron = require('node-cron');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { connectDB } = require('./config/db');
const Elder = require('./models/Elder');
const Call = require('./models/Call');
const Memory = require('./models/Memory');
const { getMemoryContext } = require('./services/memory.service');
const { placeCall } = require('./services/twilio-voice.service');
const { sendMissedCallAlert, sendWeeklySummary, sendNoPickupAlert } = require('./services/distress.service');
const { generateWeeklySummary } = require('./services/gemini.service');

const IST_TIMEZONE = 'Asia/Kolkata';
const SCHEDULER_VERBOSE_LOGS = process.env.SCHEDULER_VERBOSE_LOGS !== 'false';

const getISTDateKey = (date = new Date()) =>
  date.toLocaleDateString('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

const getCurrentIST = () => {
  const now = new Date();
  return {
    hhmm: now.toLocaleTimeString('en-GB', {
      timeZone: IST_TIMEZONE,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }),
    day: now.toLocaleDateString('en-US', { timeZone: IST_TIMEZONE, weekday: 'long' })
  };
};

const toMinutes = (hhmm) => {
  const match = String(hhmm || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getISTMinutesFromDate = (date) => {
  const hhmm = new Date(date).toLocaleTimeString('en-GB', {
    timeZone: IST_TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  return toMinutes(hhmm);
};

const isCallFromTodayInIST = (call, todayDateKey) => getISTDateKey(call?.created_at || call?.started_at || new Date()) === todayDateKey;

const getScheduledTag = (call) => String(call?.vapi_call_id || '');

const isPrimaryScheduledCall = (call) => getScheduledTag(call).startsWith('scheduled-primary-');

const isRetryScheduledCall = (call) => getScheduledTag(call).startsWith('scheduled-retry-');

const hasNoPickupMemoryForSlot = async ({ elderId, todayDateKey, slotTagSuffix }) => {
  const recentMemories = await Memory.find({ elder_id: elderId }).sort({ date: -1 }).limit(20).lean();
  return recentMemories.some((memory) => {
    const sameDay = getISTDateKey(memory.date || memory.created_at) === todayDateKey;
    if (!sameDay) return false;
    const text = `${memory.summary || ''} ${(memory.important_details || []).join(' ')}`;
    return text.includes(slotTagSuffix);
  });
};

const createNoPickupMemory = async ({ elder, slotTagSuffix, scheduleTime }) => {
  return Memory.create({
    elder_id: elder._id,
    date: new Date(),
    summary: `Call not picked up at ${scheduleTime} and retry after 10 minutes was also not answered. Mood score set to 0. (${slotTagSuffix})`,
    mood_score: 0,
    mood_label: 'very_low',
    key_topics: ['no_pickup_call'],
    people_mentioned: [],
    health_mentions: [],
    important_details: [
      `Scheduled call not picked up (${scheduleTime})`,
      'Retry after 10 minutes not picked up',
      slotTagSuffix
    ],
    follow_up_questions: ['Please check why the elder could not pick up the call today.'],
    distress_detected: false,
    distress_reason: 'no_pickup_double_attempt',
    call_duration_minutes: 0,
    call_quality: 'not_connected',
    created_at: new Date()
  });
};

const placeScheduledCallAttempt = async ({ elder, attemptNumber, todayDateKey, scheduleTime }) => {
  const tagPrefix = attemptNumber === 1 ? 'scheduled-primary' : 'scheduled-retry';
  const slotTime = String(scheduleTime || elder?.schedule_time || '00:00');
  const scheduledTag = `${tagPrefix}-${todayDateKey}-${slotTime}-${elder._id}`;

  const existingAttempt = await Call.findOne({ vapi_call_id: scheduledTag }).select('_id').lean();
  if (existingAttempt) {
    return { created: false, reason: 'duplicate_scheduled_tag' };
  }

  await getMemoryContext(elder._id);
  const twilioCall = await placeCall(elder);
  const providerCallId = twilioCall.sid || `scheduled-${attemptNumber}-${Date.now()}-${elder._id}`;

  await Call.create({
    elder_id: elder._id,
    provider_call_id: providerCallId,
    vapi_call_id: scheduledTag,
    started_at: new Date(),
    status: 'calling',
    attempt_number: attemptNumber,
    created_at: new Date()
  });

  return { created: true };
};

const scheduleDailyCalls = async () => {
  const { hhmm, day } = getCurrentIST();
  const nowMinutes = toMinutes(hhmm);
  const todayDateKey = getISTDateKey(new Date());
  const elders = await Elder.find({
    is_active: true,
    created_by: { $exists: true, $ne: null }
  }).lean();
  let duePrimary = 0;
  let dueRetry = 0;

  for (const elder of elders) {
    const allowedDays = elder.schedule_days?.length ? elder.schedule_days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const matchDay = allowedDays.includes(day);
    const scheduleMinutes = toMinutes(elder.schedule_time);
    const retryMinutes = scheduleMinutes === null ? null : (scheduleMinutes + 10) % 1440;

    const recentCalls = await Call.find({ elder_id: elder._id }).sort({ created_at: -1 }).limit(20).lean();
    const todayCalls = recentCalls.filter((call) => isCallFromTodayInIST(call, todayDateKey));

    const slotTagSuffix = `${todayDateKey}-${elder.schedule_time}-${elder._id}`;
    const primaryCallToday = todayCalls.find(
      (call) => isPrimaryScheduledCall(call) && getScheduledTag(call) === `scheduled-primary-${slotTagSuffix}`
    ) || null;
    const retryCallToday = todayCalls.find(
      (call) => isRetryScheduledCall(call) && getScheduledTag(call) === `scheduled-retry-${slotTagSuffix}`
    ) || null;

    if (!matchDay || scheduleMinutes === null || nowMinutes === null) {
      continue;
    }

    const shouldRunPrimaryNow = !primaryCallToday && nowMinutes >= scheduleMinutes;

    if (shouldRunPrimaryNow) {
      const result = await placeScheduledCallAttempt({
        elder,
        attemptNumber: 1,
        todayDateKey,
        scheduleTime: elder.schedule_time
      });
      if (result?.created) {
        duePrimary += 1;
      }
      continue;
    }

    const shouldRetryNow =
      Boolean(primaryCallToday) &&
      primaryCallToday.status === 'no_answer' &&
      !retryCallToday &&
      retryMinutes !== null &&
      nowMinutes >= retryMinutes;

    if (shouldRetryNow) {
      const result = await placeScheduledCallAttempt({
        elder,
        attemptNumber: 2,
        todayDateKey,
        scheduleTime: elder.schedule_time
      });
      if (result?.created) {
        dueRetry += 1;
      }
      continue;
    }

    const shouldMarkNoPickup =
      Boolean(primaryCallToday) &&
      primaryCallToday.status === 'no_answer' &&
      Boolean(retryCallToday) &&
      retryCallToday.status === 'no_answer';

    if (shouldMarkNoPickup) {
      const alreadyAdded = await hasNoPickupMemoryForSlot({
        elderId: elder._id,
        todayDateKey,
        slotTagSuffix
      });

      if (!alreadyAdded) {
        await createNoPickupMemory({
          elder,
          slotTagSuffix,
          scheduleTime: elder.schedule_time
        });
        await sendNoPickupAlert(elder, elder.schedule_time);
      }
    }

  }

  if (SCHEDULER_VERBOSE_LOGS) {
    console.info(
      `[scheduler] ${hhmm} IST: checked ${elders.length} elders, primary calls=${duePrimary}, retries=${dueRetry}`
    );
  }
};

const runWeeklySummary = async () => {
  const elders = await Elder.find({ is_active: true }).lean();

  for (const elder of elders) {
    const weekMemories = await Memory.find({ elder_id: elder._id }).sort({ date: -1 }).limit(7).lean();
    const summaryText = await generateWeeklySummary(
      elder.name,
      elder.family?.[0]?.name || 'Family',
      weekMemories.map((memory) => memory.summary)
    );
    await sendWeeklySummary(elder, summaryText);
  }
};

const runMissedCallChecker = async () => {
  const elders = await Elder.find({ is_active: true }).lean();

  for (const elder of elders) {
    const lastCompleted = await Call.findOne({ elder_id: elder._id, status: 'completed' }).sort({ ended_at: -1 }).lean();
    const reference = lastCompleted?.ended_at ? new Date(lastCompleted.ended_at) : null;

    if (!reference) {
      continue;
    }

    const missedDays = Math.floor((Date.now() - reference.getTime()) / (1000 * 60 * 60 * 24));
    if (missedDays >= 3) {
      await sendMissedCallAlert(elder, missedDays);
    }
  }
};

const runStatsUpdater = async () => {
  const elders = await Elder.find().lean();

  for (const elder of elders) {
    const [calls, memories] = await Promise.all([
      Call.find({ elder_id: elder._id, status: 'completed' }).lean(),
      Memory.find({ elder_id: elder._id }).lean()
    ]);

    const totalCallMinutes = calls.reduce((sum, call) => sum + Number(call.duration_seconds || 0) / 60, 0);
    const avgMood = memories.length
      ? memories.reduce((sum, memory) => sum + Number(memory.mood_score || 0), 0) / memories.length
      : 0;

    await Elder.updateOne(
      { _id: elder._id },
      {
        $set: {
          'stats.total_calls': calls.length,
          'stats.total_call_minutes': Number(totalCallMinutes.toFixed(2)),
          'stats.average_mood': Number(avgMood.toFixed(2)),
          updated_at: new Date()
        }
      }
    );
  }
};

const bootstrapScheduler = async () => {
  await connectDB();

  const runSafely = (name, job) => async () => {
    try {
      await job();
    } catch (error) {
      console.error(`[scheduler] ${name} failed:`, error?.message || error);
    }
  };

  cron.schedule('* * * * *', runSafely('scheduleDailyCalls', scheduleDailyCalls), { timezone: IST_TIMEZONE });
  cron.schedule('0 19 * * 0', runSafely('runWeeklySummary', runWeeklySummary), { timezone: IST_TIMEZONE });
  cron.schedule('0 * * * *', runSafely('runMissedCallChecker', runMissedCallChecker), { timezone: IST_TIMEZONE });
  cron.schedule('0 0 * * *', runSafely('runStatsUpdater', runStatsUpdater), { timezone: IST_TIMEZONE });

  console.log('Scheduler started with IST cron jobs');
};

bootstrapScheduler().catch((error) => {
  console.error('Failed to start scheduler:', error);
  process.exit(1);
});