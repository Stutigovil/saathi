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
const { sendMissedCallAlert, sendWeeklySummary } = require('./services/distress.service');
const { generateWeeklySummary } = require('./services/gemini.service');

const IST_TIMEZONE = 'Asia/Kolkata';

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

const scheduleDailyCalls = async () => {
  const { hhmm, day } = getCurrentIST();
  const elders = await Elder.find({ is_active: true }).lean();

  for (const elder of elders) {
    const matchTime = elder.schedule_time === hhmm;
    const allowedDays = elder.schedule_days?.length ? elder.schedule_days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const matchDay = allowedDays.includes(day);

    if (!matchTime || !matchDay) {
      continue;
    }

    await getMemoryContext(elder._id);
    const twilioCall = await placeCall(elder);
    const providerCallId = twilioCall.sid || `scheduled-${Date.now()}-${elder._id}`;

    await Call.create({
      elder_id: elder._id,
      provider_call_id: providerCallId,
      vapi_call_id: providerCallId,
      voice_id: elder.voice_id,
      started_at: new Date(),
      status: 'calling',
      attempt_number: 1,
      created_at: new Date()
    });
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

  cron.schedule('* * * * *', scheduleDailyCalls, { timezone: IST_TIMEZONE });
  cron.schedule('0 19 * * 0', runWeeklySummary, { timezone: IST_TIMEZONE });
  cron.schedule('0 * * * *', runMissedCallChecker, { timezone: IST_TIMEZONE });
  cron.schedule('0 0 * * *', runStatsUpdater, { timezone: IST_TIMEZONE });

  console.log('Scheduler started with IST cron jobs');
};

bootstrapScheduler().catch((error) => {
  console.error('Failed to start scheduler:', error);
  process.exit(1);
});