const { subDays, startOfDay } = require('date-fns');
const Memory = require('../models/Memory');

const getMemoryContext = async (elderId) => {
  const memories = await Memory.find({ elder_id: elderId }).sort({ date: -1 }).limit(5).lean();

  if (!memories.length) {
    return 'No prior memory found.';
  }

  return memories
    .map((memory) => {
      const date = new Date(memory.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      });
      return `- ${date}: mood ${memory.mood_score}/10 (${memory.mood_label}). Summary: ${memory.summary}`;
    })
    .join('\n');
};

const saveMemory = async (elderId, callId, geminiSummary) => {
  const memory = await Memory.create({
    elder_id: elderId,
    date: new Date(),
    summary: geminiSummary.summary,
    mood_score: geminiSummary.mood_score,
    mood_label: geminiSummary.mood_label,
    key_topics: geminiSummary.key_topics || [],
    people_mentioned: geminiSummary.people_mentioned || [],
    health_mentions: geminiSummary.health_mentions || [],
    important_details: geminiSummary.important_details || [],
    follow_up_questions: geminiSummary.follow_up_questions || [],
    distress_detected: geminiSummary.distress_detected || false,
    distress_reason: geminiSummary.distress_reason || '',
    call_duration_minutes: geminiSummary.call_duration_minutes || 0,
    call_quality: geminiSummary.call_quality || 'good',
    created_at: new Date()
  });

  return memory;
};

const getMemoryTimeline = async (elderId, days = 7) => {
  const fromDate = startOfDay(subDays(new Date(), Number(days) - 1));
  return Memory.find({
    elder_id: elderId,
    date: { $gte: fromDate }
  })
    .sort({ date: -1 })
    .lean();
};

const getMoodTrend = async (elderId, days = 7) => {
  const memories = await getMemoryTimeline(elderId, days);
  return memories
    .map((memory) => ({
      date: memory.date,
      mood_score: memory.mood_score,
      mood_label: memory.mood_label
    }))
    .reverse();
};

module.exports = {
  getMemoryContext,
  saveMemory,
  getMemoryTimeline,
  getMoodTrend
};