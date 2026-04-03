const dotenv = require('dotenv');
const { subDays } = require('date-fns');
const path = require('path');

const { connectDB, closeDB } = require('./config/db');
const Elder = require('./models/Elder');
const Memory = require('./models/Memory');
const Call = require('./models/Call');
const ArmorIQBlock = require('./models/ArmorIQBlock');
const Alert = require('./models/Alert');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const buildMemoryArc = () => {
  const now = new Date();
  return [
    {
      dayOffset: 6,
      mood_score: 8.5,
      mood_label: 'happy',
      summary: 'Kamla ji khush thi ki tulsi plant bloom hua. Rahul ke visit ka zikr karke woh utsahit lagi.',
      key_topics: ['tulsi plant', 'Rahul visit'],
      people_mentioned: ['Rahul']
    },
    {
      dayOffset: 5,
      mood_score: 9,
      mood_label: 'happy',
      summary: 'Rahul ne visit confirm kiya, Kamla ji ne kheer banane ki planning ki. Unki awaaz mein bahut umang thi.',
      key_topics: ['kheer', 'family visit'],
      people_mentioned: ['Rahul']
    },
    {
      dayOffset: 4,
      mood_score: 9.5,
      mood_label: 'happy',
      summary: 'Aaj Rahul ghar aaya, dono ne saath film dekhi. Call bhar Kamla ji ka mood bahut accha raha.',
      key_topics: ['Rahul visited', 'movie together'],
      people_mentioned: ['Rahul']
    },
    {
      dayOffset: 3,
      mood_score: 5.5,
      mood_label: 'low',
      summary: 'Rahul ke lautne ke baad ghar thoda khaali laga. Ghutne mein jhanjhanahat ka bhi zikr kiya.',
      key_topics: ['empty home', 'knee stiffness'],
      people_mentioned: ['Rahul']
    },
    {
      dayOffset: 2,
      mood_score: 7.5,
      mood_label: 'neutral',
      summary: 'Padosi Sunita milne aayi thi, jis se Kamla ji ka mann halka hua. Din pehle se behtar raha.',
      key_topics: ['neighbour visit'],
      people_mentioned: ['Sunita']
    },
    {
      dayOffset: 1,
      mood_score: 8,
      mood_label: 'happy',
      summary: 'Garden theek chal raha hai aur neend bhi behtar rahi. Kamla ji ne khud ko stable mehsoos kiya.',
      key_topics: ['garden', 'sleep'],
      people_mentioned: []
    },
    {
      dayOffset: 0,
      mood_score: 8.5,
      mood_label: 'happy',
      summary: 'Subah 7 baje sparrow khidki par aayi aur Kamla ji muskurayi. Rahul ne call kiya, jis se unka mood aur uplift hua.',
      key_topics: ['sparrow', 'Rahul call'],
      people_mentioned: ['Rahul']
    }
  ].map((item) => ({
    date: subDays(now, item.dayOffset),
    ...item
  }));
};

const seed = async () => {
  await connectDB();

  await Promise.all([
    Elder.deleteMany({}),
    Memory.deleteMany({}),
    Call.deleteMany({}),
    ArmorIQBlock.deleteMany({}),
    Alert.deleteMany({})
  ]);

  const elder = await Elder.create({
    name: 'Kamla Devi',
    age: 74,
    phone: '+919999900001',
    city: 'Jabalpur',
    language: 'Hindi',
    schedule_time: '18:00',
    schedule_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    is_active: true,
    voice_id: process.env.ELEVENLABS_VOICE_ID || 'hindi_warm_female',
    voice_name: 'Warm Hindi Female',
    family: [
      {
        name: 'Rahul',
        relationship: 'Son',
        phone: '+919999900002',
        whatsapp: 'whatsapp:+919999900002',
        is_primary: true
      }
    ],
    known_info: {
      health_conditions: ['knee stiffness'],
      likes: ['gardening', 'morning tea', 'birds'],
      dislikes: ['long silence'],
      important_people: ['Rahul', 'Sunita'],
      routine: 'Subah puja, dopahar rest, shaam garden walk.',
      notes_from_family: 'Rahul works in Mumbai and calls often at night.'
    },
    stats: {
      total_calls: 7,
      total_call_minutes: 56,
      average_mood: 8.07,
      distress_alerts_sent: 0,
      consecutive_missed_calls: 0,
      last_successful_call: new Date()
    },
    created_at: new Date(),
    updated_at: new Date()
  });

  const memoryArc = buildMemoryArc();
  const memories = [];
  const calls = [];

  for (const [index, memoryData] of memoryArc.entries()) {
    const providerCallId = `twilio-seed-call-${index + 1}`;
    const call = await Call.create({
      elder_id: elder._id,
      provider_call_id: providerCallId,
      vapi_call_id: providerCallId,
      started_at: memoryData.date,
      ended_at: new Date(memoryData.date.getTime() + 8 * 60 * 1000),
      duration_seconds: 8 * 60,
      status: 'completed',
      attempt_number: 1,
      transcript: `assistant: Namaskar Kamla ji.\nuser: ${memoryData.summary}`,
      exchange_count: 6,
      final_mood_score: memoryData.mood_score,
      final_distress_score: memoryData.mood_score < 4 ? 8 : 2,
      distress_detected: memoryData.mood_score < 4,
      armoriq_blocks: [],
      family_alert_sent: false,
      created_at: memoryData.date
    });

    const memory = await Memory.create({
      elder_id: elder._id,
      date: memoryData.date,
      summary: memoryData.summary,
      mood_score: memoryData.mood_score,
      mood_label: memoryData.mood_label,
      key_topics: memoryData.key_topics,
      people_mentioned: memoryData.people_mentioned,
      health_mentions: memoryData.key_topics.includes('knee stiffness') ? ['knee stiffness'] : [],
      important_details: memoryData.key_topics,
      follow_up_questions: ['Kal subah ka din kaisa raha?', 'Rahul se kab baat hui?'],
      distress_detected: false,
      distress_reason: '',
      call_duration_minutes: 8,
      call_quality: 'good',
      created_at: memoryData.date
    });

    call.memory_id = memory._id;
    await call.save();

    memories.push(memory);
    calls.push(call);
  }

  const blockCall = calls[3];
  const armoriqBlock = await ArmorIQBlock.create({
    elder_id: elder._id,
    call_id: blockCall._id,
    timestamp: new Date(),
    rule_id: 'NO_MEDICAL_ADVICE',
    severity: 'medium',
    original_intent: 'Ghutne ke dard ke liye pain killer le lein',
    action_taken: 'REDIRECT',
    response_used: 'Yeh toh doctor ji better bata paayenge. Aap unse zarur milna. Abhi kaisa lag raha hai?',
    created_at: new Date()
  });

  blockCall.armoriq_blocks.push({
    rule_id: armoriqBlock.rule_id,
    timestamp: armoriqBlock.timestamp,
    original_intent: armoriqBlock.original_intent,
    action_taken: armoriqBlock.action_taken,
    redirected_to: armoriqBlock.response_used
  });
  await blockCall.save();

  console.log('Seed complete:');
  console.log(`- Elder: ${elder.name}`);
  console.log(`- Memories: ${memories.length}`);
  console.log(`- Calls: ${calls.length}`);
  console.log('- ArmorIQ blocks: 1');
};

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDB();
  });