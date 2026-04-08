const express = require('express');
const twilio = require('twilio');
 const crypto = require('crypto');
const Call = require('../models/Call');
const CallReminder = require('../models/CallReminder');
const Elder = require('../models/Elder');
const FamilyUser = require('../models/FamilyUser');
const { mapTwilioStatusToCallStatus } = require('../services/twilio-voice.service');
const { summarizeCall, getConversationResponse } = require('../services/gemini.service');
const { saveMemory, getMemoryContext } = require('../services/memory.service');
const { evaluateDistress, sendDistressAlert } = require('../services/distress.service');
const { checkResponse, logBlock } = require('../services/armoriq.service');
const { synthesizeSpeech } = require('../services/elevenlabs.service');
const {
  ensureBasePrompt,
  getEffectiveSystemPrompt,
  sanitizeDynamicPromptState
} = require('../services/prompt-manager');

const router = express.Router();
const { twiml: TwiML } = twilio;
const ttsAudioCache = new Map();
const TTS_CACHE_TTL_MS = 5 * 60 * 1000;
const TTS_GENERATION_TIMEOUT_MS = Number(process.env.TTS_GENERATION_TIMEOUT_MS || 9000);
const TTS_GATHER_TIMEOUT_MS = Number(process.env.TTS_GATHER_TIMEOUT_MS || 2500);
const AI_REPLY_TIMEOUT_MS = Number(process.env.AI_REPLY_TIMEOUT_MS || 2500);
const AI_REPLY_TIMEOUT_MAX_MS = Number(process.env.AI_REPLY_TIMEOUT_MAX_MS || 7000);
const ELEVENLABS_CLONE_STABILITY = Number(process.env.ELEVENLABS_CLONE_STABILITY || 0.42);
const ELEVENLABS_CLONE_SIMILARITY = Number(process.env.ELEVENLABS_CLONE_SIMILARITY || 0.9);
const ELEVENLABS_CLONE_STYLE = Number(process.env.ELEVENLABS_CLONE_STYLE || 0.55);
const ELEVENLABS_CLONE_SPEED = Number(process.env.ELEVENLABS_CLONE_SPEED || 0.92);
const MAX_CALL_TURNS = Number(process.env.MAX_CALL_TURNS || 6);
const isElevenLabsEnabled = () => process.env.ELEVENLABS_ENABLED === 'true';
const TWILIO_HINDI_VOICE = process.env.TWILIO_HINDI_VOICE || 'Polly.Aditi';
const TWILIO_HINDI_LANGUAGE = process.env.TWILIO_HINDI_LANGUAGE || 'hi-IN';
const TWILIO_SPEECH_MODEL = String(process.env.TWILIO_SPEECH_MODEL || 'default').trim();
const TWILIO_SPEECH_LANGUAGE = String(process.env.TWILIO_SPEECH_LANGUAGE || '').trim();
const TWILIO_SPEECH_TIMEOUT_SECONDS = String(process.env.TWILIO_SPEECH_TIMEOUT_SECONDS || '2');
const TWILIO_ACTION_ON_EMPTY_RESULT = process.env.TWILIO_ACTION_ON_EMPTY_RESULT !== 'false';
const TWILIO_PROFANITY_FILTER = process.env.TWILIO_PROFANITY_FILTER !== 'false';
const TWILIO_MIN_SPEECH_CONFIDENCE = Number(process.env.TWILIO_MIN_SPEECH_CONFIDENCE || 0.3);
const TWILIO_SPEECH_HINTS =
  process.env.TWILIO_SPEECH_HINTS ||
  'dard,chot,pair,sujan,bukhar,chakkar,kamjori,udaas,tension,saans,dawai,doctor,parivaar,beta,beti';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DEFAULT_FALLBACK_RESPONSE =
  'Mujhe aapki baat poori tarah clear nahi mili. Kripya ek baar dheere se phir batayen, main dhyan se sun rahi hoon.';

const normalizeAbsoluteHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

const getPublicBaseUrl = (req) => {
  const fromEnv =
    normalizeAbsoluteHttpUrl(process.env.PUBLIC_BASE_URL) ||
    normalizeAbsoluteHttpUrl(process.env.BACKEND_PUBLIC_URL) ||
    normalizeAbsoluteHttpUrl(process.env.TWILIO_WEBHOOK_BASE_URL);

  if (fromEnv) return fromEnv;

  const host = req?.headers?.host;
  if (!host) return '';

  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req?.protocol || 'http';
  return `${protocol}://${host}`.replace(/\/$/, '');
};

const getHindiIntroText = (elderName) =>
  `Namaskar ${elderName || 'ji'}, main Saathi bol rahi hoon. Aap kaise hain? Aaj aapka din kaisa raha?`;

const getHindiClosingText = () => 'Aapki baat sunkar bahut achha laga. Main kal fir se call karungi. Dhanyavaad.';
const buildGatherAction = (elderId, turn) =>
  `/webhook/twilio/gather?elderId=${encodeURIComponent(String(elderId || ''))}&turn=${encodeURIComponent(String(turn || 1))}`;

const getGatherOptions = (elderId, turn, elder) => {
  const hints = [TWILIO_SPEECH_HINTS, elder?.name, elder?.city]
    .filter(Boolean)
    .join(',');

  const normalizedModel = TWILIO_SPEECH_MODEL.toLowerCase();
  let speechLanguage = TWILIO_SPEECH_LANGUAGE || TWILIO_HINDI_LANGUAGE;

  // Twilio Gather + Deepgram Nova-3 works best in multilingual mode for Hindi calls.
  if (normalizedModel === 'deepgram_nova-3' && !TWILIO_SPEECH_LANGUAGE) {
    speechLanguage = 'multi';
  }

  const options = {
    input: 'speech',
    language: speechLanguage,
    speechTimeout: TWILIO_SPEECH_TIMEOUT_SECONDS,
    actionOnEmptyResult: TWILIO_ACTION_ON_EMPTY_RESULT,
    profanityFilter: TWILIO_PROFANITY_FILTER,
    hints,
    action: buildGatherAction(elderId, turn),
    method: 'POST'
  };

  if (TWILIO_SPEECH_MODEL && TWILIO_SPEECH_MODEL.toLowerCase() !== 'auto') {
    options.speechModel = TWILIO_SPEECH_MODEL;
  }

  return options;
};
const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sanitizeReplyForSpeech = (text, elderName) => {
  let output = String(text || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\{[\s\S]*\}/g, '')
    .replace(/\barmor\s*iq\b/gi, '')
    .replace(/\barmoriq\b/gi, '')
    .replace(/\binternal (system|policy|guardrail)s?\b/gi, '')
    .replace(/\bsafety (check|filter|policy)\b/gi, '')
    .replace(/\brule\s*triggered\b/gi, '')
    .replace(/call analysis|transcript analysis|response text|distress score|mood score|topics mentioned/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return output.replace(/\s+/g, ' ').trim();
};

const isAskingOwnName = (speech) => {
  const normalized = normalizeForRepeatCheck(speech);
  if (!normalized) return false;

  return [
    /mera\s+naam\s+pata/, 
    /kya\s+aapko\s+mera\s+naam\s+pata/, 
    /aapko\s+mera\s+naam\s+yaad/, 
    /kya\s+aap\s+mera\s+naam\s+jaante/, 
    /do\s+you\s+know\s+my\s+name/
  ].some((pattern) => pattern.test(normalized));
};

const extractPrimaryRelation = (elder) => {
  const firstFamily = Array.isArray(elder?.family) ? elder.family.find((f) => f?.relationship) : null;
  if (firstFamily?.relationship) {
    return {
      relationship: String(firstFamily.relationship).trim(),
      personName: String(firstFamily.name || '').trim()
    };
  }

  const notes = String(elder?.known_info?.notes_from_family || '');
  const match = notes.match(/primary\s+family\s+relation\s*:\s*([^\n]+)/i);
  if (!match?.[1]) return null;
  return {
    relationship: String(match[1]).trim(),
    personName: ''
  };
};

const getFamilyProfileFromOwner = (owner) => {
  const profile = owner?.family_profile || {};
  return {
    member_name: String(profile.member_name || '').trim(),
    relationship_with_elder: String(profile.relationship_with_elder || '').trim(),
    phone: String(profile.phone || '').trim(),
    whatsapp: String(profile.whatsapp || '').trim(),
    platform_reason: String(profile.platform_reason || '').trim()
  };
};

const getProfileKnowledgeResponse = (speech, elder, familyProfile = null) => {
  const normalized = normalizeForRepeatCheck(speech);
  if (!normalized || !elder) return null;

  if (isAskingOwnName(speech) && elder.name) {
    return `Ji haan, aapka naam ${elder.name} hai. Main aapko yaad rakhti hoon.`;
  }

  if (/meri\s+umar|main\s+kitne\s+saal|my\s+age|age\s+kya/.test(normalized) && elder.age) {
    return `Ji, aapki umar ${elder.age} saal hai.`;
  }

  if (/main\s+kahan\s+rehti|mera\s+sheher|meri\s+city|which\s+city/.test(normalized) && elder.city) {
    return `Ji, aap ${elder.city} mein rehti hain.`;
  }

  if (/meri\s+bhasha|main\s+kaunsi\s+language|which\s+language/.test(normalized) && elder.language) {
    return `Ji, aapki preferred language ${elder.language} hai.`;
  }

  if (/mera\s+(beta|beti|betaa|betaa|parivaar)|mere\s+ghar\s+mein\s+kaun|family\s+relation/.test(normalized)) {
    const relation = extractPrimaryRelation(elder) || {
      relationship: String(familyProfile?.relationship_with_elder || '').trim(),
      personName: String(familyProfile?.member_name || '').trim()
    };

    if (relation?.relationship && relation.personName) {
      return `Ji, aapke primary family contact ${relation.personName} hain, aur relation ${relation.relationship} hai.`;
    }
    if (relation?.relationship) {
      return `Ji, onboarding ke hisaab se aapka primary family relation ${relation.relationship} hai.`;
    }
  }

  if (/family\s+member\s+ka\s+naam|mere\s+family\s+member\s+ka\s+naam|kis\s+naam\s+se\s+save/.test(normalized)) {
    const memberName = String(familyProfile?.member_name || '').trim();
    if (memberName) {
      return `Ji, aapke family member ka naam ${memberName} hai.`;
    }
  }

  if (/family\s+phone|ghar\s+walo\s+ka\s+number|mera\s+emergency\s+number|kisko\s+call\s+karen/.test(normalized)) {
    const phone = String(familyProfile?.phone || '').trim();
    if (phone) {
      return `Ji, aapka family contact number ${phone} hai.`;
    }
  }

  if (/whatsapp\s+number|family\s+whatsapp/.test(normalized)) {
    const whatsapp = String(familyProfile?.whatsapp || '').trim();
    if (whatsapp) {
      return `Ji, family WhatsApp number ${whatsapp} hai.`;
    }
  }

  if (/call\s+time|kab\s+call\s+karte|schedule|kis\s+samay/.test(normalized) && elder.schedule_time) {
    return `Ji, aapka daily call schedule ${elder.schedule_time} IST set hai.`;
  }

  return null;
};

const isAwkwardInjuryQuestion = (text) => {
  const normalized = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  const patterns = [
    'chot lagne se aapko aaram',
    'chot lagne ke baad aapko aaram',
    'kya chot lagne se',
    'kya aapko lagta hai ki chot lagne ke baad'
  ];
  return patterns.some((p) => normalized.includes(p));
};

const normalizeForRepeatCheck = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s?]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getRecentAssistantUtterances = (transcript, limit = 3) => {
  const lines = String(transcript || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.toLowerCase().startsWith('assistant:'))
    .map((line) => line.replace(/^assistant:\s*/i, '').trim());

  return lines.slice(-limit);
};

const tokenOverlapScore = (a, b) => {
  const aTokens = new Set(normalizeForRepeatCheck(a).split(' ').filter((t) => t.length > 2));
  const bTokens = new Set(normalizeForRepeatCheck(b).split(' ').filter((t) => t.length > 2));
  if (!aTokens.size || !bTokens.size) return 0;
  let shared = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) shared += 1;
  });
  return shared / Math.max(aTokens.size, bTokens.size);
};

const isRepeatedAssistantIntent = (candidate, recentUtterances) => {
  const normalizedCandidate = normalizeForRepeatCheck(candidate);
  if (!normalizedCandidate) return false;

  return recentUtterances.some((previous) => {
    const normalizedPrevious = normalizeForRepeatCheck(previous);
    if (!normalizedPrevious) return false;

    if (normalizedCandidate === normalizedPrevious) return true;

    const bothQuestions = normalizedCandidate.includes('?') && normalizedPrevious.includes('?');
    if (!bothQuestions) return false;

    return tokenOverlapScore(normalizedCandidate, normalizedPrevious) >= 0.65;
  });
};

const pickNonRepeatingFollowUp = (candidates, recentUtterances, offset = 0) => {
  if (!Array.isArray(candidates) || !candidates.length) return '';

  for (let i = 0; i < candidates.length; i += 1) {
    const index = (offset + i) % candidates.length;
    const candidate = candidates[index];
    if (!isRepeatedAssistantIntent(candidate, recentUtterances)) {
      return candidate;
    }
  }

  return candidates[offset % candidates.length];
};

const isUserEndingConversation = (speech) => {
  const normalized = normalizeForRepeatCheck(speech);
  if (!normalized) return false;

  return [
    /kal\s+baat\s+karenge?/, 
    /kal\s+baat\s+karte\s+hain/, 
    /baad\s+mein\s+baat\s+karenge?/, 
    /phir\s+baat\s+karenge?/, 
    /network\s+kharab/, 
    /net\s+kharab/, 
    /abhi\s+rakhte\s+hain/, 
    /bye|good\s*night|shubh\s*ratri/
  ].some((pattern) => pattern.test(normalized));
};

const buildFreshFollowUp = (speech, turn, recentUtterances = []) => {
  const normalized = normalizeForRepeatCheck(speech);

  const painFollowUps = [
    'Samajh sakti hoon ji, takleef hui hogi. Abhi chalne mein kitni dikkat ho rahi hai?',
    'Afsos hua sunke ji. Pair par sujan hai kya, ya sirf dard ho raha hai?',
    'Theek hai ji, aap aaram se batayein. Dard subah se same hai ya badh gaya?'
  ];

  const lowMoodFollowUps = [
    'Main samajh rahi hoon ji. Is waqt sabse zyada kis baat ka bojh lag raha hai?',
    'Aap akeli nahi hain ji. Kya ghar mein abhi koi paas mein baitha hai?',
    'Theek hai ji, main saath hoon. Aaj ek chhoti si cheez kya thi jisne thoda behtar feel karaya?'
  ];

  const neutralFollowUps = [
    'Samajh gaya ji. Aaj din ka kaunsa hissa thoda heavy laga?',
    'Theek hai ji, main dhyan se sun rahi hoon. Aap thoda aur detail mein batayengi?',
    'Ji bilkul, aap aaram se batayein. Main yahin hoon sunne ke liye.',
    'Aap aaram se boliye ji, main sun rahi hoon. Ismein sabse mushkil kya lag raha hai?',
    'Theek hai ji. Aapki baat zaroori hai, zara dheere se phir batayengi?',
    'Samajh rahi hoon ji. Aapko abhi kis baat ka sabse zyada tension ho raha hai?'
  ];

  const bucket =
    /dard|chot|pair|gir|sujan|bukhar|kamjor|thakan/.test(normalized)
      ? painFollowUps
      : /udaas|akela|tension|ghabra|pareshan|dar/.test(normalized)
        ? lowMoodFollowUps
        : neutralFollowUps;

  return pickNonRepeatingFollowUp(bucket, recentUtterances, turn % bucket.length);
};

const isCustomClonedVoice = (voiceId) => {
  const current = String(voiceId || '').trim();
  const defaultVoice = String(process.env.ELEVENLABS_VOICE_ID || '').trim();
  return Boolean(current) && (!defaultVoice || current !== defaultVoice);
};

const buildElevenLabsTtsOptions = ({ voiceId } = {}) => {
  if (!isCustomClonedVoice(voiceId)) {
    return {};
  }

  return {
    stability: ELEVENLABS_CLONE_STABILITY,
    similarityBoost: ELEVENLABS_CLONE_SIMILARITY,
    style: ELEVENLABS_CLONE_STYLE,
    speed: ELEVENLABS_CLONE_SPEED
  };
};

const cacheTtsAudio = async (text, voiceId, timeoutMs = TTS_GENERATION_TIMEOUT_MS, ttsOptions = {}) => {
  let tts = null;

  try {
    tts = await Promise.race([
      synthesizeSpeech(text, voiceId || process.env.ELEVENLABS_VOICE_ID, ttsOptions),
      sleep(timeoutMs).then(() => null)
    ]);
  } catch (error) {
    console.warn(`TTS generation error. Falling back to Twilio say: ${error?.message || error}`);
    return null;
  }

  if (!tts?.audioBuffer) {
    console.warn(`TTS generation timed out/unavailable. Falling back to Twilio say for text: ${text.slice(0, 60)}...`);
    return null;
  }

  const token = crypto.randomUUID();
  ttsAudioCache.set(token, {
    audioBuffer: tts.audioBuffer,
    mimeType: tts.mimeType || 'audio/mpeg',
    expiresAt: Date.now() + TTS_CACHE_TTL_MS
  });

  return token;
};

const getCachedAudio = (token) => {
  const item = ttsAudioCache.get(token);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    ttsAudioCache.delete(token);
    return null;
  }
  return item;
};

const speakWithPreferredTts = async (target, text, { useElevenLabs, publicBase, voiceId, ttsTimeoutMs }) => {
  if (useElevenLabs) {
    const ttsOptions = buildElevenLabsTtsOptions({ voiceId });
    const token = await cacheTtsAudio(text, voiceId, ttsTimeoutMs, ttsOptions);
    if (token) {
      target.play(`${publicBase}/webhook/twilio/tts?token=${encodeURIComponent(token)}`);
      return true;
    }
    console.warn('ElevenLabs TTS unavailable, falling back to Twilio say.');
  }

  target.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, text);
  return false;
};

const hasUserSpeech = (transcript) => /(^|\n)\s*user\s*:/i.test(String(transcript || ''));

const isExplicitNoPickupStatus = (twilioStatus) => {
  const status = String(twilioStatus || '').toLowerCase();
  return ['busy', 'no-answer', 'canceled', 'failed'].includes(status);
};

const isReminderTriggeredCall = (call) => String(call?.vapi_call_id || '').startsWith('reminder-');

const finalizeMissedCallWithZeroMood = async (call) => {
  if (!call || call.memory_id) return;

  const reminderMissed = isReminderTriggeredCall(call);
  const missedReason = reminderMissed ? 'Triggered reminder call was missed.' : 'Call was missed.';

  const memory = await saveMemory(call.elder_id, call._id, {
    summary: `${missedReason} No conversation transcript captured. Mood score set to 0.`,
    mood_score: 0,
    mood_label: 'very_low',
    key_topics: ['missed_call'],
    people_mentioned: [],
    health_mentions: [],
    important_details: [
      missedReason,
      'Call not started or transcript was empty.'
    ],
    follow_up_questions: ['Please check in with the elder and retry the call later.'],
    distress_detected: false,
    distress_reason: 'missed_call',
    call_duration_minutes: 0,
    call_quality: 'not_connected'
  });

  call.final_mood_score = 0;
  call.final_distress_score = 0;
  call.distress_detected = false;
  call.memory_id = memory._id;
};

const finalizeCompletedCall = async (call, elder) => {
  if (!call || call.memory_id) return;

  const transcript = String(call.transcript || '').trim();
  if (!hasUserSpeech(transcript)) {
    // Do not generate synthetic memories for cut/no-conversation calls.
    return;
  }

  let summary;
  try {
    summary = await summarizeCall(transcript, elder?.name || 'Elder', new Date().toISOString());
  } catch (error) {
    console.warn(`summarizeCall failed for ${call.provider_call_id}: ${error?.message || error}`);
    const compactTranscript = transcript
      .split('\n')
      .map((line) => line.replace(/^assistant:\s*/i, '').replace(/^user:\s*/i, '').trim())
      .filter(Boolean)
      .slice(-6)
      .join(' ')
      .slice(0, 220);

    summary = {
      summary: compactTranscript || 'Call completed with limited transcript available.',
      mood_score: 5,
      mood_label: 'neutral',
      key_topics: [],
      people_mentioned: [],
      health_mentions: [],
      important_details: [],
      follow_up_questions: [],
      distress_detected: false,
      distress_reason: '',
      call_duration_minutes: Math.max(1, Math.round(Number(call.duration_seconds || 0) / 60)),
      call_quality: 'limited'
    };
  }

  const memory = await saveMemory(call.elder_id, call._id, summary);
  call.final_mood_score = Number(summary.mood_score || 0);
  call.final_distress_score = summary.distress_detected ? 8 : 2;
  call.distress_detected = Boolean(summary.distress_detected);
  call.memory_id = memory._id;

  const distressState = evaluateDistress(call);
  if (distressState.shouldAlert && elder) {
    await sendDistressAlert(elder, summary.summary);
    call.family_alert_sent = true;
    call.family_alert_type = 'distress';
  }
};

const syncReminderStatusFromCall = async (call) => {
  if (!call?._id) return;
  const callTag = String(call.vapi_call_id || '');
  if (!callTag.startsWith('reminder-')) return;

  const terminalStatus = String(call.status || '').toLowerCase();
  if (!['completed', 'no_answer', 'error'].includes(terminalStatus)) return;

  const reminderStatus = terminalStatus === 'completed' ? 'completed' : 'failed';

  await CallReminder.findOneAndUpdate(
    { call_id: call._id, status: 'triggered' },
    {
      status: reminderStatus,
      processed_at: new Date(),
      updated_at: new Date(),
      error_message:
        terminalStatus === 'error'
          ? 'Call ended with error status.'
          : terminalStatus === 'no_answer'
            ? 'Triggered reminder call was missed.'
            : ''
    }
  );
};

router.post('/twilio/voice', async (req, res) => {
  try {
    const elderId = req.query.elderId || req.body.elderId;
    const elder = elderId ? await Elder.findById(elderId).lean() : null;
    const introText = getHindiIntroText(elder?.name);
    const publicBase = getPublicBaseUrl(req);
    const useElevenLabs = Boolean(isElevenLabsEnabled() && process.env.ELEVENLABS_API_KEY && publicBase);
    const elderVoiceId = elder?.voice_id || process.env.ELEVENLABS_VOICE_ID;
    console.info(`TTS mode: ${useElevenLabs ? 'elevenlabs' : 'twilio'} (publicBase=${publicBase ? 'set' : 'missing'})`);
    const vr = new TwiML.VoiceResponse();

    const gather = vr.gather(getGatherOptions(elderId, 1, elder));

    await speakWithPreferredTts(gather, introText, { useElevenLabs, publicBase, voiceId: elderVoiceId });
    vr.say(
      { voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE },
      'Aapki awaaz theek se nahi aayi. Main dubara sunne ki koshish karti hoon.'
    );
    vr.redirect({ method: 'POST' }, buildGatherAction(elderId, 1));

    res.type('text/xml').send(vr.toString());
  } catch {
    const vr = new TwiML.VoiceResponse();
    vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, 'Maaf kijiye, technical problem ki wajah se call complete nahi ho paya.');
    vr.hangup();
    res.type('text/xml').send(vr.toString());
  }
});

router.get('/twilio/tts', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (token) {
      const item = getCachedAudio(token);
      if (!item) {
        return res.status(404).send('TTS token expired');
      }
      res.setHeader('Content-Type', item.mimeType);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(item.audioBuffer);
    }

    const elderId = req.query.elderId;
    const kind = String(req.query.kind || 'intro');
    const dynamicText = String(req.query.text || '').trim();
    const elder = elderId ? await Elder.findById(elderId).lean() : null;

    let text = getHindiIntroText(elder?.name);
    if (kind === 'dynamic' && dynamicText) {
      text = dynamicText;
    } else if (kind === 'closing') {
      text = getHindiClosingText();
    }

    const tts = await synthesizeSpeech(text, elder?.voice_id || process.env.ELEVENLABS_VOICE_ID);

    if (!tts?.audioBuffer) {
      return res.status(404).send('TTS unavailable');
    }

    res.setHeader('Content-Type', tts.mimeType || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(tts.audioBuffer);
  } catch {
    return res.status(404).send('TTS generation failed');
  }
});

router.post('/twilio/gather', async (req, res) => {
  try {
    const callSid = req.body.CallSid;
    let speech = String(req.body.SpeechResult || '').trim();
    const confidence = Number(req.body.Confidence);
    const speechWordCount = speech ? speech.split(/\s+/).filter(Boolean).length : 0;
    const shortSpeech = speech.length < 12 || speechWordCount <= 2;
    const hasLowConfidenceSpeech =
      speech && Number.isFinite(confidence) && confidence >= 0 && confidence < TWILIO_MIN_SPEECH_CONFIDENCE && shortSpeech;

    if (hasLowConfidenceSpeech) {
      console.warn(
        `Dropping low-confidence speech in gather (confidence=${confidence.toFixed(2)} threshold=${TWILIO_MIN_SPEECH_CONFIDENCE}).`
      );
      speech = '';
    }

    const call = await Call.findOne({ provider_call_id: callSid });
    const elderId = req.query.elderId || req.body.elderId || call?.elder_id;
    const turn = Math.max(1, Number(req.query.turn || 1));
    const nextTurn = turn + 1;
    const elder = elderId ? await Elder.findById(elderId).lean() : null;
    const owner = elder?.created_by
      ? await FamilyUser.findById(elder.created_by).select('family_profile').lean()
      : null;
    const familyProfile = getFamilyProfileFromOwner(owner);
    const publicBase = getPublicBaseUrl(req);
    const useElevenLabs = Boolean(isElevenLabsEnabled() && process.env.ELEVENLABS_API_KEY && publicBase);
    const elderVoiceId = elder?.voice_id || process.env.ELEVENLABS_VOICE_ID;

    const vr = new TwiML.VoiceResponse();

    if (!speech) {
      if (turn >= MAX_CALL_TURNS) {
        await speakWithPreferredTts(vr, getHindiClosingText(), { useElevenLabs, publicBase, voiceId: elderVoiceId });
        vr.hangup();
      } else {
        const regather = vr.gather(getGatherOptions(elderId, nextTurn, elder));
        await speakWithPreferredTts(regather, 'Aapki awaaz theek se sunayi nahi di. Kripya phir se batayen, main sun rahi hoon.', {
          useElevenLabs,
          publicBase,
          voiceId: elderVoiceId,
          ttsTimeoutMs: TTS_GATHER_TIMEOUT_MS
        });
        vr.redirect({ method: 'POST' }, buildGatherAction(elderId, nextTurn));
      }
      return res.type('text/xml').send(vr.toString());
    }

    if (call && speech) {
      call.transcript = [call.transcript, `user: ${speech}`].filter(Boolean).join('\n');
      call.exchange_count = Number(call.exchange_count || 0) + 1;
    }

    const recentAssistantUtterances = getRecentAssistantUtterances(call?.transcript, 4);
    let responseText = DEFAULT_FALLBACK_RESPONSE;
    const profileKnowledgeResponse = getProfileKnowledgeResponse(speech, elder, familyProfile);

    if (profileKnowledgeResponse) {
      responseText = profileKnowledgeResponse;
    } else {
      try {
        const effectiveAiTimeoutMs = Math.max(1200, Math.min(AI_REPLY_TIMEOUT_MS, AI_REPLY_TIMEOUT_MAX_MS));
        const aiResult = await Promise.race([
          (async () => {
            const memoryContext = elderId ? await getMemoryContext(elderId) : 'No prior memory found.';
            const baseSystemPrompt = ensureBasePrompt({ call, elder, memoryContext });
            const effectiveSystemPrompt = getEffectiveSystemPrompt({
              basePrompt: baseSystemPrompt,
              dynamicPromptState: call?.dynamic_prompt_state
            });

            const transcriptForAI = call?.transcript || speech;

            return getConversationResponse({
              transcript: transcriptForAI,
              memoryContext,
              elderName: elder?.name || 'Elder',
              elderProfile: {
                ...(elder || {}),
                family_context: familyProfile
              },
              baseSystemPrompt: effectiveSystemPrompt,
              dynamicPromptState: call?.dynamic_prompt_state || ''
            });
          })(),
          sleep(effectiveAiTimeoutMs).then(() => null)
        ]);

        if (!aiResult) {
          console.warn(`AI reply timed out in gather flow after ${effectiveAiTimeoutMs}ms. Using fallback response.`);
          responseText = buildFreshFollowUp(speech, turn, recentAssistantUtterances);
        }

        responseText = String(aiResult?.response_text || responseText).trim();

        if (call && aiResult?.dynamic_prompt_state) {
          call.dynamic_prompt_state = sanitizeDynamicPromptState(aiResult.dynamic_prompt_state);
        }

        if (aiResult?.end_call === true) {
          responseText = `${responseText} ${getHindiClosingText()}`;
        }
      } catch {
        responseText = buildFreshFollowUp(speech, turn, recentAssistantUtterances);
      }
    }

    const normalizedSpeech = speech.replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedResponse = responseText.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!normalizedResponse || normalizedResponse.length < 24 || normalizedResponse === normalizedSpeech) {
      responseText = 'Yeh sunkar achha laga. Aaj ka sabse accha pal kaunsa raha, thoda aur bataiyega?';
    }

    let safeResponseText = sanitizeReplyForSpeech(responseText, elder?.name).slice(0, 320);

    if (isAwkwardInjuryQuestion(safeResponseText)) {
      safeResponseText = 'Mujhe afsos hai ji, girne se takleef hui hogi. Abhi dard zyada hai ya thoda kam, aur chalne mein dikkat ho rahi hai kya?';
    }
    let finalResponseText = safeResponseText;

    try {
      const armoriqResult = await checkResponse(safeResponseText, elder, speech);
      if (!armoriqResult.passed) {
        finalResponseText = sanitizeReplyForSpeech(armoriqResult.safe_response, elder?.name).slice(0, 320);
        console.warn(
          `[ArmorIQ] Blocked by ${armoriqResult.rule_triggered} action=${armoriqResult.action} severity=${armoriqResult.severity}`
        );

        if (call && elderId) {
          await logBlock(elderId, call?._id, {
            rule_triggered: armoriqResult.rule_triggered,
            severity: armoriqResult.severity,
            original_intent: armoriqResult.original_intent,
            action: armoriqResult.action,
            safe_response: finalResponseText,
            timestamp: new Date()
          });
        }

        if (armoriqResult.action === 'ESCALATE' && call) {
          call.distress_detected = true;
        }
      }
    } catch (armoriqError) {
      console.warn(`ArmorIQ check failed: ${armoriqError?.message || armoriqError}`);
    }

    if (isRepeatedAssistantIntent(finalResponseText, recentAssistantUtterances)) {
      finalResponseText = buildFreshFollowUp(speech, turn + 1, recentAssistantUtterances);
      console.warn('Detected repeated assistant question intent; switched to fresh contextual follow-up.');
    }

    const userWantsToEndCall = isUserEndingConversation(speech);
    if (userWantsToEndCall) {
      finalResponseText = 'Theek hai ji, hum kal baat karenge. Aap aaram kijiye, apna khayal rakhiye.';
    }

    const shouldEndCall = turn >= MAX_CALL_TURNS || userWantsToEndCall;

    if (shouldEndCall) {
      const endingText = `${finalResponseText} ${getHindiClosingText()}`.trim();
      await speakWithPreferredTts(vr, endingText, {
        useElevenLabs,
        publicBase,
        voiceId: elderVoiceId,
        ttsTimeoutMs: TTS_GATHER_TIMEOUT_MS
      });
      vr.hangup();
    } else {
      const regather = vr.gather(getGatherOptions(elderId, nextTurn, elder));
      await speakWithPreferredTts(regather, finalResponseText, {
        useElevenLabs,
        publicBase,
        voiceId: elderVoiceId,
        ttsTimeoutMs: TTS_GATHER_TIMEOUT_MS
      });
      vr.redirect({ method: 'POST' }, buildGatherAction(elderId, nextTurn));
    }

    if (call) {
      call.transcript = [call.transcript, `assistant: ${finalResponseText}`].filter(Boolean).join('\n');
      call.exchange_count = Number(call.exchange_count || 0) + 1;
      await call.save();
    }

    res.type('text/xml').send(vr.toString());
  } catch {
    const vr = new TwiML.VoiceResponse();
    vr.hangup();
    res.type('text/xml').send(vr.toString());
  }
});

router.post('/twilio/status', async (req, res, next) => {
  try {
    const callSid = req.body.CallSid;
    const twilioStatus = req.body.CallStatus;
    const twilioErrorCode = String(req.body.ErrorCode || '').trim();
    const twilioErrorMessage = String(req.body.ErrorMessage || '').trim();
    const duration = Number(req.body.CallDuration || 0);
    const call = await Call.findOne({ provider_call_id: callSid });

    if (twilioErrorCode || twilioErrorMessage) {
      console.warn(
        `Twilio status error sid=${callSid || 'unknown'} status=${twilioStatus || 'unknown'} code=${twilioErrorCode || 'n/a'} message=${twilioErrorMessage || 'n/a'}`
      );
    }

    if (!call) {
      return res.status(200).json({ acknowledged: true, message: 'Call not found' });
    }

    const mappedStatus = mapTwilioStatusToCallStatus(twilioStatus);
    call.status = mappedStatus;

    if (mappedStatus === 'in_progress' && !call.started_at) {
      call.started_at = new Date();
    }

    if (isExplicitNoPickupStatus(twilioStatus)) {
      call.status = 'no_answer';
    }

    if (mappedStatus === 'completed') {
      call.ended_at = new Date();
      call.duration_seconds = duration || call.duration_seconds || 0;

      const transcript = String(call.transcript || '').trim();
      const transcriptEmpty = transcript.length === 0;
      const hadConversation = hasUserSpeech(transcript);
      const wasConnected =
        Boolean(call.started_at) ||
        Number(call.duration_seconds || 0) > 0 ||
        Number(call.exchange_count || 0) > 0 ||
        hadConversation;

      if (!wasConnected && !isExplicitNoPickupStatus(twilioStatus)) {
        call.status = 'no_answer';
      }

      if (!call.started_at || transcriptEmpty) {
        call.status = 'no_answer';
      }

      if (call.status === 'no_answer') {
        await finalizeMissedCallWithZeroMood(call);
        await call.save();
        await syncReminderStatusFromCall(call);
        return res.status(200).json({ acknowledged: true });
      }

      const elder = await Elder.findById(call.elder_id);
      await finalizeCompletedCall(call, elder);
    }

    if (call.status === 'no_answer') {
      await finalizeMissedCallWithZeroMood(call);
    }

    await call.save();
    await syncReminderStatusFromCall(call);
    return res.status(200).json({ acknowledged: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;