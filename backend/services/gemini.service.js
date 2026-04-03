const axios = require('axios');
const {
  getSathiSystemPrompt,
  getConversationExtractionPrompt,
  getCallSummaryPrompt,
  getDistressAlertPrompt,
  getWeeklySummaryPrompt,
  getMemoryContextPrompt
} = require('../prompts/sathi.prompts');

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const MAX_RETRIES = Number(process.env.GROQ_MAX_RETRIES || 2);
const RETRY_BASE_DELAY_MS = Number(process.env.GROQ_RETRY_BASE_DELAY_MS || 700);
const MIN_REQUEST_GAP_MS = Number(process.env.GROQ_MIN_REQUEST_GAP_MS || 3000);
const GROQ_COOLDOWN_MS = Number(process.env.GROQ_COOLDOWN_MS || 10 * 60 * 1000);
const GROQ_QUOTA_ZERO_COOLDOWN_MS = Number(process.env.GROQ_QUOTA_ZERO_COOLDOWN_MS || 6 * 60 * 60 * 1000);
const GROQ_DISABLE_ON_QUOTA_ZERO = process.env.GROQ_DISABLE_ON_QUOTA_ZERO !== 'false';

let nextGroqRequestAt = 0;
let groqBlockedUntil = 0;
let groqBlockedReason = '';

const isGroqEnabled = () => process.env.GROQ_ENABLED !== 'false';

const parseJsonFromText = (text, fallback = {}) => {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
};

const extractEmbeddedJson = (text) => {
  const cleaned = String(text || '').replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
};

const normalizeSpokenText = (value) =>
  String(value || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\{[\s\S]*\}/g, '')
    .replace(/call analysis|transcript analysis|response text|distress score|mood score/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const parseConversationResponse = (rawText, fallback) => {
  const parsed = parseJsonFromText(rawText, null) || extractEmbeddedJson(rawText);
  if (parsed && typeof parsed === 'object') {
    return {
      ...fallback,
      ...parsed,
      response_text: normalizeSpokenText(parsed.response_text || fallback.response_text).slice(0, 320)
    };
  }

  const cleaned = String(rawText || '').replace(/```json|```/g, '').trim();
  if (!cleaned) {
    return fallback;
  }

  const responseTextMatch = cleaned.match(/"response_text"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  if (responseTextMatch?.[1]) {
    const unescaped = responseTextMatch[1]
      .replace(/\\n/g, ' ')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    return {
      ...fallback,
      response_text: normalizeSpokenText(unescaped).slice(0, 320)
    };
  }

  return {
    ...fallback,
    response_text: normalizeSpokenText(cleaned).slice(0, 320)
  };
};

const clampScore = (value, min = 0, max = 10, fallback = 5) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const parseSummaryResponse = (rawText, fallback) => {
  const parsed = parseJsonFromText(rawText, null) || extractEmbeddedJson(rawText);
  if (parsed && typeof parsed === 'object') {
    return {
      ...fallback,
      ...parsed,
      summary: String(parsed.summary || fallback.summary).replace(/\s+/g, ' ').trim().slice(0, 700),
      mood_score: clampScore(parsed.mood_score, 0, 10, fallback.mood_score),
      distress_detected: Boolean(parsed.distress_detected),
      key_topics: Array.isArray(parsed.key_topics) ? parsed.key_topics : fallback.key_topics,
      people_mentioned: Array.isArray(parsed.people_mentioned) ? parsed.people_mentioned : fallback.people_mentioned,
      health_mentions: Array.isArray(parsed.health_mentions) ? parsed.health_mentions : fallback.health_mentions,
      important_details: Array.isArray(parsed.important_details) ? parsed.important_details : fallback.important_details,
      follow_up_questions: Array.isArray(parsed.follow_up_questions) ? parsed.follow_up_questions : fallback.follow_up_questions
    };
  }

  return fallback;
};

const buildConversationMessages = ({
  transcript,
  memoryContext,
  elderName,
  elderProfile,
  baseSystemPrompt,
  dynamicPromptState
}) => {
  const formattedMemoryContext = getMemoryContextPrompt(
    Array.isArray(memoryContext)
      ? memoryContext
      : [String(memoryContext || 'No memory context available yet.')]
  );

  const fallbackElderProfile = {
    name: elderName,
    age: 'Unknown',
    city: 'Unknown',
    language: 'Hindi'
  };

  const effectiveElderProfile = {
    ...fallbackElderProfile,
    ...(elderProfile || {})
  };

  const systemPrompt =
    String(dynamicPromptState || '').trim() ||
    String(baseSystemPrompt || '').trim() ||
    getSathiSystemPrompt(effectiveElderProfile, formattedMemoryContext);

  const userPrompt = getConversationExtractionPrompt(transcript, formattedMemoryContext, elderName);

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorStatus = (error) => {
  const status = Number(error?.status || error?.response?.status || error?.cause?.status);
  return Number.isNaN(status) ? undefined : status;
};

const parseRetryAfterMs = (error) => {
  const retryAfterHeader =
    error?.response?.headers?.['retry-after'] ||
    error?.headers?.['retry-after'] ||
    error?.headers?.get?.('retry-after');

  const parsed = Number(retryAfterHeader);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed * 1000;
};

const parseRetryDelayFromMessage = (error) => {
  const text = String(error?.message || '');
  const match = text.match(/Please retry in\s+([0-9.]+)(ms|s)/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return match[2].toLowerCase() === 's' ? value * 1000 : value;
};

const isQuotaError = (error) => {
  const text = String(error?.message || '').toLowerCase();
  return text.includes('quota exceeded') || text.includes('rate limit');
};

const isGroqBlocked = () => Date.now() < groqBlockedUntil;

const applyGroqCooldown = (error) => {
  const retryAfterDelay = parseRetryAfterMs(error);
  const retryTextDelay = parseRetryDelayFromMessage(error);
  const isQuota = isQuotaError(error);

  const cooldownMs = isQuota && GROQ_DISABLE_ON_QUOTA_ZERO
    ? GROQ_QUOTA_ZERO_COOLDOWN_MS
    : Math.max(GROQ_COOLDOWN_MS, retryAfterDelay || 0, retryTextDelay || 0);

  groqBlockedUntil = Date.now() + cooldownMs;
  groqBlockedReason = isQuota ? 'quota_or_rate_limited' : 'temporarily_unavailable';

  console.warn(
    `Groq temporarily disabled for ${cooldownMs}ms due to ${groqBlockedReason}. Using local fallbacks until cooldown ends.`
  );
};

const waitForRequestWindow = async () => {
  const now = Date.now();
  if (nextGroqRequestAt > now) {
    await sleep(nextGroqRequestAt - now);
  }
  nextGroqRequestAt = Math.max(nextGroqRequestAt, Date.now()) + Math.max(0, MIN_REQUEST_GAP_MS);
};

const generateText = async ({ prompt, messages }) => {
  if (!isGroqEnabled()) {
    throw new Error('Groq disabled by GROQ_ENABLED=false');
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  if (isGroqBlocked()) {
    throw new Error(`Groq cooldown active until ${new Date(groqBlockedUntil).toISOString()} (${groqBlockedReason})`);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await waitForRequestWindow();
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: GROQ_MODEL,
          messages: messages?.length ? messages : [{ role: 'user', content: String(prompt || '') }],
          temperature: 0.2
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const text = response?.data?.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('Groq response contained no text');
      }

      return text;
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);

      if (TRANSIENT_STATUSES.has(status) && attempt < MAX_RETRIES) {
        const retryAfterDelay = parseRetryAfterMs(error);
        const retryTextDelay = parseRetryDelayFromMessage(error);
        const exponentialDelay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        const jitter = Math.floor(Math.random() * 300);
        const delay = Math.max(retryAfterDelay || 0, retryTextDelay || 0, exponentialDelay + jitter);

        console.warn(
          `Groq transient error on ${GROQ_MODEL} (status ${status || 'unknown'}) attempt ${attempt}/${MAX_RETRIES}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      if (status === 429) {
        console.warn(
          `Groq quota/rate limit exhausted on ${GROQ_MODEL} after ${MAX_RETRIES} attempts. Entering cooldown.`
        );
        applyGroqCooldown(error);
      }

      throw error;
    }
  }

  throw lastError || new Error('Groq request failed');
};

const getConversationResponse = async ({
  transcript,
  memoryContext,
  elderName,
  elderProfile,
  baseSystemPrompt,
  dynamicPromptState
}) => {
  const messages = buildConversationMessages({
    transcript,
    memoryContext,
    elderName,
    elderProfile,
    baseSystemPrompt,
    dynamicPromptState
  });
  const raw = await generateText({ messages });

  const fallback = {
    response_text: 'Aapki baat sunkar achha laga. Kya aaj ka din thoda behtar raha?',
    distress_score: 2,
    mood_score: 6,
    topics_mentioned: [],
    memory_worthy: true,
    follow_up_for_next_call: [],
    end_call: false,
    alert_family: false,
    dynamic_prompt_state: String(dynamicPromptState || baseSystemPrompt || '').trim()
  };

  return parseConversationResponse(raw, fallback);
};

const summarizeCall = async (transcript, elderName, callDate) => {
  const prompt = getCallSummaryPrompt(transcript, elderName, callDate);
  const fallback = {
    summary: `${elderName} ke saath call mein halka-phulka samvaad hua aur unhone apne din ke baare mein baat ki. Overall baatcheet sakaratmak rahi.`,
    mood_score: 7,
    mood_label: 'neutral',
    key_topics: [],
    people_mentioned: [],
    health_mentions: [],
    important_details: [],
    follow_up_questions: [],
    distress_detected: false,
    distress_reason: '',
    call_duration_minutes: 5,
    call_quality: 'good'
  };

  try {
    const raw = await generateText({ prompt });
    return parseSummaryResponse(raw, fallback);
  } catch (error) {
    console.error('Groq summarizeCall failed, using fallback summary:', error?.message || error);
    return fallback;
  }
};

const generateDistressAlert = async (elderName, familyName, summary, moodTrend) => {
  const prompt = getDistressAlertPrompt(elderName, familyName, summary, moodTrend);
  try {
    return await generateText({ prompt });
  } catch (error) {
    console.error('Groq distress alert generation failed, using fallback text:', error?.message || error);
    return `${familyName} ji, ${elderName} ki aaj ki baat-cheet mein thodi pareshani ke sanket mile. Kripya unse jaldi baat karke unki haal-chaal lein.`;
  }
};

const generateWeeklySummary = async (elderName, familyName, sevenDaySummaries) => {
  const prompt = getWeeklySummaryPrompt(elderName, familyName, sevenDaySummaries);
  try {
    return await generateText({ prompt });
  } catch (error) {
    console.error('Groq weekly summary generation failed, using fallback text:', error?.message || error);
    return `${familyName} ji, is hafte ${elderName} ke routine mein samanaya sthirta rahi. Detailed AI summary filhal uplabdh nahi hai, lekin daily check-ins continue rakhein.`;
  }
};

module.exports = {
  getConversationResponse,
  summarizeCall,
  generateDistressAlert,
  generateWeeklySummary
};