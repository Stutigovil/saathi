const express = require('express');
const twilio = require('twilio');
 const crypto = require('crypto');
const Call = require('../models/Call');
const Elder = require('../models/Elder');
const { mapTwilioStatusToCallStatus } = require('../services/twilio-voice.service');
const { summarizeCall, getConversationResponse } = require('../services/gemini.service');
const { saveMemory, getMemoryContext } = require('../services/memory.service');
const { evaluateDistress, sendDistressAlert } = require('../services/distress.service');
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
const TTS_GENERATION_TIMEOUT_MS = Number(process.env.TTS_GENERATION_TIMEOUT_MS || 3500);
const AI_REPLY_TIMEOUT_MS = Number(process.env.AI_REPLY_TIMEOUT_MS || 2500);
const GROQ_MIN_REQUEST_GAP_MS = Number(process.env.GROQ_MIN_REQUEST_GAP_MS || 0);
const MAX_CALL_TURNS = Number(process.env.MAX_CALL_TURNS || 6);
const isElevenLabsEnabled = () => process.env.ELEVENLABS_ENABLED === 'true';
const TWILIO_HINDI_VOICE = process.env.TWILIO_HINDI_VOICE || 'Polly.Aditi';
const TWILIO_HINDI_LANGUAGE = process.env.TWILIO_HINDI_LANGUAGE || 'hi-IN';
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

router.post('/twilio/voice', async (req, res) => {
  try {
    const elderId = req.query.elderId || req.body.elderId;
    const elder = elderId ? await Elder.findById(elderId).lean() : null;
    const effectiveVoiceId = elder?.voice_id || null;
    console.info(`TTS intro: elderId=${elderId || 'n/a'} voice_id=${effectiveVoiceId || 'default'}`);
    const introText = getHindiIntroText(elder?.name);
    const publicBase = getPublicBaseUrl();
    const useElevenLabs = Boolean(isElevenLabsEnabled() && process.env.ELEVENLABS_API_KEY && publicBase);
    console.info(`TTS mode: ${useElevenLabs ? 'elevenlabs' : 'twilio'} (publicBase=${publicBase ? 'set' : 'missing'})`);
    const vr = new TwiML.VoiceResponse();

    const gather = vr.gather({
      input: 'speech',
      language: 'hi-IN',
      speechTimeout: 'auto',
      action: buildGatherAction(elderId, 1),
      method: 'POST'
    });

    if (useElevenLabs) {
      const introToken = await cacheTtsAudio(introText, effectiveVoiceId);
      if (introToken) {
        gather.play(`${publicBase}/webhook/twilio/tts?token=${encodeURIComponent(introToken)}`);
      } else {
        console.warn('ElevenLabs intro TTS unavailable, falling back to Twilio say.');
        gather.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, introText);
      }
    } else {
      gather.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, introText);
    }

    vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, 'Aapki awaaz theek se nahi aayi. Main dubara sunne ki koshish karti hoon.');
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

    const tts = await synthesizeSpeech(text, effectiveVoiceId);

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
    const effectiveVoiceId = call?.voice_id || elder?.voice_id || null;
    console.info(
      `TTS gather: callId=${call?._id || 'n/a'} call_voice=${call?.voice_id || 'none'} elder_voice=${elder?.voice_id || 'none'} using=${effectiveVoiceId || 'default'}`
    );

    const vr = new TwiML.VoiceResponse();

    if (!speech) {
      if (turn >= MAX_CALL_TURNS) {
        vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, getHindiClosingText());
        vr.hangup();
      } else {
        const regather = vr.gather({
          input: 'speech',
          language: 'hi-IN',
          speechTimeout: 'auto',
          action: buildGatherAction(elderId, nextTurn),
          method: 'POST'
        });
        regather.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, 'Aapki awaaz theek se sunayi nahi di. Kripya phir se batayen, main sun rahi hoon.');
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

    const safeResponseText = sanitizeReplyForSpeech(responseText, elder?.name).slice(0, 320);

    const publicBase = getPublicBaseUrl();
    const useElevenLabs = Boolean(isElevenLabsEnabled() && process.env.ELEVENLABS_API_KEY && publicBase);
    const shouldEndCall = turn >= MAX_CALL_TURNS;

    if (shouldEndCall) {
      if (useElevenLabs) {
        const [responseToken, closingToken] = await Promise.all([
          cacheTtsAudio(safeResponseText, effectiveVoiceId),
          cacheTtsAudio(getHindiClosingText(), effectiveVoiceId)
        ]);

        if (responseToken) {
          vr.play(`${publicBase}/webhook/twilio/tts?token=${encodeURIComponent(responseToken)}`);
        } else {
          console.warn('ElevenLabs response TTS unavailable, falling back to Twilio say.');
          vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, safeResponseText);
        }

        if (closingToken) {
          vr.play(`${publicBase}/webhook/twilio/tts?token=${encodeURIComponent(closingToken)}`);
        } else {
          console.warn('ElevenLabs closing TTS unavailable, falling back to Twilio say.');
          vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, getHindiClosingText());
        }
      } else {
        vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, safeResponseText);
        vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, getHindiClosingText());
      }
      vr.hangup();
    } else {
      const regather = vr.gather({
        input: 'speech',
        language: 'hi-IN',
        speechTimeout: 'auto',
        action: buildGatherAction(elderId, nextTurn),
        method: 'POST'
      });
      regather.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, safeResponseText);
      vr.say({ voice: TWILIO_HINDI_VOICE, language: TWILIO_HINDI_LANGUAGE }, 'Aap batate rahiye, main dhyan se sun rahi hoon.');
      vr.redirect({ method: 'POST' }, buildGatherAction(elderId, nextTurn));
    }

    if (call) {
      call.transcript = [call.transcript, `assistant: ${safeResponseText}`].filter(Boolean).join('\n');
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

    if (mappedStatus === 'completed') {
      call.ended_at = new Date();
      call.duration_seconds = duration || call.duration_seconds || 0;

      if (!call.memory_id) {
        const elder = await Elder.findById(call.elder_id);
        const transcript = call.transcript || 'assistant: Namaskar. user: Aaj theek hoon.';
        const summary = await summarizeCall(transcript, elder?.name || 'Elder', new Date().toISOString());
        const memory = await saveMemory(call.elder_id, call._id, summary);

        call.final_mood_score = summary.mood_score;
        call.final_distress_score = summary.distress_detected ? 8 : 2;
        call.distress_detected = Boolean(summary.distress_detected);
        call.memory_id = memory._id;

        const distressState = evaluateDistress(call);
        if (distressState.shouldAlert && elder) {
          await sendDistressAlert(elder, memory.summary);
          call.family_alert_sent = true;
          call.family_alert_type = 'distress';
        }
      }
    }

    await call.save();
    return res.status(200).json({ acknowledged: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;