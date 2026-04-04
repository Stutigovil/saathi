const express = require('express');
const twilio = require('twilio');
 const crypto = require('crypto');
const Call = require('../models/Call');
const Elder = require('../models/Elder');
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
const AI_REPLY_TIMEOUT_MS = Number(process.env.AI_REPLY_TIMEOUT_MS || 2500);
const GROQ_MIN_REQUEST_GAP_MS = Number(process.env.GROQ_MIN_REQUEST_GAP_MS || 0);
const MAX_CALL_TURNS = Number(process.env.MAX_CALL_TURNS || 6);
const isElevenLabsEnabled = () => process.env.ELEVENLABS_ENABLED === 'true';
const TWILIO_HINDI_VOICE = process.env.TWILIO_HINDI_VOICE || 'Polly.Aditi';
const TWILIO_HINDI_LANGUAGE = process.env.TWILIO_HINDI_LANGUAGE || 'hi-IN';
const TWILIO_SPEECH_MODEL = process.env.TWILIO_SPEECH_MODEL || 'experimental_conversations';
const TWILIO_SPEECH_TIMEOUT_SECONDS = String(process.env.TWILIO_SPEECH_TIMEOUT_SECONDS || '2');
const TWILIO_ACTION_ON_EMPTY_RESULT = process.env.TWILIO_ACTION_ON_EMPTY_RESULT !== 'false';
const TWILIO_PROFANITY_FILTER = process.env.TWILIO_PROFANITY_FILTER !== 'false';
const TWILIO_SPEECH_HINTS =
  process.env.TWILIO_SPEECH_HINTS ||
  'dard,chot,pair,sujan,bukhar,chakkar,kamjori,udaas,tension,saans,dawai,doctor,parivaar,beta,beti';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPublicBaseUrl = () => {
  const url = process.env.PUBLIC_BASE_URL || process.env.BACKEND_PUBLIC_URL;
  return url ? url.replace(/\/$/, '') : '';
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

  return {
    input: 'speech',
    language: TWILIO_HINDI_LANGUAGE,
    speechModel: TWILIO_SPEECH_MODEL,
    speechTimeout: TWILIO_SPEECH_TIMEOUT_SECONDS,
    actionOnEmptyResult: TWILIO_ACTION_ON_EMPTY_RESULT,
    profanityFilter: TWILIO_PROFANITY_FILTER,
    hints,
    action: buildGatherAction(elderId, turn),
    method: 'POST'
  };
};
const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sanitizeReplyForSpeech = (text, elderName) => {
  let output = String(text || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\{[\s\S]*\}/g, '')
    .replace(/call analysis|transcript analysis|response text|distress score|mood score|topics mentioned/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (elderName) {
    output = output.replace(new RegExp(`\\b${escapeRegExp(elderName)}\\b`, 'gi'), '');
  }

  return output.replace(/\s+/g, ' ').trim();
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

const buildFreshFollowUp = (speech, turn) => {
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
    'Ji bilkul, aap aaram se batayein. Main yahin hoon sunne ke liye.'
  ];

  const bucket =
    /dard|chot|pair|gir|sujan|bukhar|kamjor|thakan/.test(normalized)
      ? painFollowUps
      : /udaas|akela|tension|ghabra|pareshan|dar/.test(normalized)
        ? lowMoodFollowUps
        : neutralFollowUps;

  return bucket[turn % bucket.length];
};

const cacheTtsAudio = async (text, voiceId) => {
  let tts = null;

  try {
    tts = await Promise.race([
      synthesizeSpeech(text, voiceId || process.env.ELEVENLABS_VOICE_ID),
      sleep(TTS_GENERATION_TIMEOUT_MS).then(() => null)
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

const speakWithPreferredTts = async (target, text, { useElevenLabs, publicBase }) => {
  if (useElevenLabs) {
    const token = await cacheTtsAudio(text);
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

const finalizeCompletedCall = async (call, elder) => {
  if (!call || call.memory_id) return;

  const transcript = String(call.transcript || '').trim();
  const summaryTranscript = transcript || `assistant: Namaskar ${elder?.name || 'ji'}. user: Aaj theek hoon.`;

  let summary;
  try {
    summary = await summarizeCall(summaryTranscript, elder?.name || 'Elder', new Date().toISOString());
  } catch (error) {
    console.warn(`summarizeCall failed for ${call.provider_call_id}: ${error?.message || error}`);
    summary = {
      summary: transcript
        ? 'Call complete hua. Elder ne saamaanya roop se baat ki. Follow-up routine check-in rakhein.'
        : 'Call connect hua, lekin conversation details limited rahi. Routine follow-up continue rakhein.',
      mood_score: transcript ? 5 : 4,
      mood_label: transcript ? 'neutral' : 'low',
      key_topics: [],
      people_mentioned: [],
      health_mentions: [],
      important_details: [],
      follow_up_questions: [],
      distress_detected: false,
      distress_reason: '',
      call_duration_minutes: Math.max(1, Math.round(Number(call.duration_seconds || 0) / 60)),
      call_quality: transcript ? 'good' : 'limited'
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

router.post('/twilio/voice', async (req, res) => {
  try {
    const elderId = req.query.elderId || req.body.elderId;
    const elder = elderId ? await Elder.findById(elderId).lean() : null;
    const introText = getHindiIntroText(elder?.name);
    const publicBase = getPublicBaseUrl();
    const useElevenLabs = Boolean(isElevenLabsEnabled() && process.env.ELEVENLABS_API_KEY && publicBase);
    console.info(`TTS mode: ${useElevenLabs ? 'elevenlabs' : 'twilio'} (publicBase=${publicBase ? 'set' : 'missing'})`);
    const vr = new TwiML.VoiceResponse();

    const gather = vr.gather(getGatherOptions(elderId, 1, elder));

    await speakWithPreferredTts(gather, introText, { useElevenLabs, publicBase });
    await speakWithPreferredTts(vr, 'Aapki awaaz theek se nahi aayi. Main dubara sunne ki koshish karti hoon.', {
      useElevenLabs,
      publicBase
    });
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

    const tts = await synthesizeSpeech(text);

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
    const speech = String(req.body.SpeechResult || '').trim();
    const call = await Call.findOne({ provider_call_id: callSid });
    const elderId = req.query.elderId || req.body.elderId || call?.elder_id;
    const turn = Math.max(1, Number(req.query.turn || 1));
    const nextTurn = turn + 1;
    const elder = elderId ? await Elder.findById(elderId).lean() : null;
    const publicBase = getPublicBaseUrl();
    const useElevenLabs = Boolean(isElevenLabsEnabled() && process.env.ELEVENLABS_API_KEY && publicBase);

    const vr = new TwiML.VoiceResponse();

    if (!speech) {
      if (turn >= MAX_CALL_TURNS) {
        await speakWithPreferredTts(vr, getHindiClosingText(), { useElevenLabs, publicBase });
        vr.hangup();
      } else {
        const regather = vr.gather(getGatherOptions(elderId, nextTurn, elder));
        await speakWithPreferredTts(regather, 'Aapki awaaz theek se sunayi nahi di. Kripya phir se batayen, main sun rahi hoon.', {
          useElevenLabs,
          publicBase
        });
        vr.redirect({ method: 'POST' }, buildGatherAction(elderId, nextTurn));
      }
      return res.type('text/xml').send(vr.toString());
    }

    if (call && speech) {
      call.transcript = [call.transcript, `user: ${speech}`].filter(Boolean).join('\n');
      call.exchange_count = Number(call.exchange_count || 0) + 1;
    }

    let responseText = 'Aapki baat sunkar achha laga. Aap apna khayal rakhiye.';

    try {
      const effectiveAiTimeoutMs = Math.max(AI_REPLY_TIMEOUT_MS, GROQ_MIN_REQUEST_GAP_MS + 2000, 3000);
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
            elderProfile: elder,
            baseSystemPrompt: effectiveSystemPrompt,
            dynamicPromptState: call?.dynamic_prompt_state || ''
          });
        })(),
        sleep(effectiveAiTimeoutMs).then(() => null)
      ]);

      if (!aiResult) {
        console.warn(`AI reply timed out in gather flow after ${effectiveAiTimeoutMs}ms. Using fallback response.`);
      }

      responseText = String(aiResult?.response_text || responseText).trim();

      if (call && aiResult?.dynamic_prompt_state) {
        call.dynamic_prompt_state = sanitizeDynamicPromptState(aiResult.dynamic_prompt_state);
      }

      if (aiResult?.end_call === true) {
        responseText = `${responseText} ${getHindiClosingText()}`;
      }
    } catch {
      responseText = 'Aapki baat sunkar achha laga. Aap apna khayal rakhiye.';
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

    const recentAssistantUtterances = getRecentAssistantUtterances(call?.transcript, 3);
    if (isRepeatedAssistantIntent(finalResponseText, recentAssistantUtterances)) {
      finalResponseText = buildFreshFollowUp(speech, turn);
      console.warn('Detected repeated assistant question intent; switched to fresh contextual follow-up.');
    }

    const shouldEndCall = turn >= MAX_CALL_TURNS;

    if (shouldEndCall) {
      if (useElevenLabs) {
        const [responseToken, closingToken] = await Promise.all([
          cacheTtsAudio(finalResponseText),
          cacheTtsAudio(getHindiClosingText())
        ]);

        if (responseToken) {
          vr.play(`${publicBase}/webhook/twilio/tts?token=${encodeURIComponent(responseToken)}`);
        } else {
          console.warn('ElevenLabs response TTS unavailable, falling back to Twilio say.');
          vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, finalResponseText);
        }

        if (closingToken) {
          vr.play(`${publicBase}/webhook/twilio/tts?token=${encodeURIComponent(closingToken)}`);
        } else {
          console.warn('ElevenLabs closing TTS unavailable, falling back to Twilio say.');
          vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, getHindiClosingText());
        }
      } else {
        vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, finalResponseText);
        vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, getHindiClosingText());
      }
      vr.hangup();
    } else {
      const regather = vr.gather(getGatherOptions(elderId, nextTurn, elder));
      await speakWithPreferredTts(regather, finalResponseText, { useElevenLabs, publicBase });
      await speakWithPreferredTts(vr, 'Aap batate rahiye, main dhyan se sun rahi hoon.', { useElevenLabs, publicBase });
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
    const duration = Number(req.body.CallDuration || 0);
    const call = await Call.findOne({ provider_call_id: callSid });

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
      const hadConversation = hasUserSpeech(transcript);
      const wasConnected =
        Boolean(call.started_at) ||
        Number(call.duration_seconds || 0) > 0 ||
        Number(call.exchange_count || 0) > 0 ||
        hadConversation;

      if (!wasConnected && !isExplicitNoPickupStatus(twilioStatus)) {
        call.status = 'no_answer';
      }

      if (call.status === 'no_answer') {
        await call.save();
        return res.status(200).json({ acknowledged: true });
      }

      const elder = await Elder.findById(call.elder_id);
      await finalizeCompletedCall(call, elder);
    }

    await call.save();
    return res.status(200).json({ acknowledged: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;