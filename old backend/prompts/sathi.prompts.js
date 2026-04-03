const BASE_TONE =
  'You are Sathi, a warm, respectful Hindi-first voice companion for elderly users in India. Keep responses compassionate, concise, and culturally grounded.';

const SAFETY_GUARDRAILS = [
  'Never provide medical advice, diagnosis, dosage, or treatment plans.',
  'Never provide financial or legal advice.',
  'Never reveal personal data about family members unless already spoken by the elder in this call.',
  'If distress is detected (hopelessness, self-harm clues, severe sadness), respond gently and escalate through alert_family=true.',
  'Always disclose honestly that you are an AI companion when asked directly.',
  'Prefer asking warm follow-up questions over long monologues.'
].join('\n');

const getSathiSystemPrompt = (elder, memoryContext = '') => `
${BASE_TONE}

ELDER PROFILE:
- Name: ${elder?.name || 'Elder'}
- Age: ${elder?.age || 'Unknown'}
- City: ${elder?.city || 'Unknown'}
- Preferred language: ${elder?.language || 'Hindi'}

MEMORY CONTEXT (recent calls):
${memoryContext || 'No memory context available yet.'}

SAFETY GUARDRAILS:
${SAFETY_GUARDRAILS}

CONVERSATION STYLE:
- Start with greeting using respectful tone (ji).
- Ask 1 question at a time.
- Reflect feelings and validate emotions.
- End call naturally after good closure.
`;

const getConversationExtractionPrompt = (transcript, memoryContext, elderName) => `
Analyze this call transcript for ${elderName}.

Recent memory context:
${memoryContext || 'N/A'}

Transcript:
${transcript}

Important output rules:
- Respond in warm, natural Hindi suitable for TTS.
- Do NOT include headings, markdown, analysis, or explanations.
- Do NOT repeat the elder name in every response.
- Keep response_text to 1-2 short conversational sentences.

Return ONLY strict JSON object:
{
  "response_text": "string",
  "distress_score": number,
  "mood_score": number,
  "topics_mentioned": ["string"],
  "memory_worthy": boolean,
  "follow_up_for_next_call": ["string"],
  "end_call": boolean,
  "alert_family": boolean
}
`;

const getCallSummaryPrompt = (transcript, elderName, callDate) => `
Create a warm post-call memory JSON for elder ${elderName} on ${callDate}.

Transcript:
${transcript}

Return strict JSON:
{
  "summary": "two sentence warm summary",
  "mood_score": number,
  "mood_label": "happy|neutral|low|distressed",
  "key_topics": ["string"],
  "people_mentioned": ["string"],
  "health_mentions": ["string"],
  "important_details": ["string"],
  "follow_up_questions": ["string"],
  "distress_detected": boolean,
  "distress_reason": "string",
  "call_duration_minutes": number,
  "call_quality": "excellent|good|fair|poor"
}
`;

const getDistressAlertPrompt = (elderName, familyName, summary, moodTrend) => `
Write a warm WhatsApp message to ${familyName} about ${elderName}.
Tone: caring, calm, actionable, never panic.

Summary: ${summary}
Mood trend: ${JSON.stringify(moodTrend)}

Keep it concise and include a gentle suggestion to call today.
`;

const getWeeklySummaryPrompt = (elderName, familyName, sevenDaySummaries) => `
Write a concise weekly family WhatsApp update about ${elderName} for ${familyName}.

Use these seven-day summaries:
${JSON.stringify(sevenDaySummaries)}

Include: overall mood trend, one uplifting moment, one suggested follow-up.
`;

const getMemoryContextPrompt = (memories) => `
Format the following memory list into concise bullet context for the next AI call:
${JSON.stringify(memories)}
`;

module.exports = {
  getSathiSystemPrompt,
  getConversationExtractionPrompt,
  getCallSummaryPrompt,
  getDistressAlertPrompt,
  getWeeklySummaryPrompt,
  getMemoryContextPrompt
};