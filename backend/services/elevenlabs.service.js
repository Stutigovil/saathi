const axios = require('axios');
const https = require('https');
const FormData = require('form-data');

const ELEVENLABS_COOLDOWN_MS = Number(process.env.ELEVENLABS_COOLDOWN_MS || 60 * 60 * 1000);
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';
const ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_22050_32';
const ELEVENLABS_OPTIMIZE_STREAMING_LATENCY = process.env.ELEVENLABS_OPTIMIZE_STREAMING_LATENCY;
const ELEVENLABS_LANGUAGE_CODE = process.env.ELEVENLABS_LANGUAGE_CODE || 'hi';
const ELEVENLABS_TEXT_NORMALIZATION = process.env.ELEVENLABS_TEXT_NORMALIZATION || 'auto';
const ELEVENLABS_TIMEOUT_MS = Number(process.env.ELEVENLABS_TIMEOUT_MS || 9000);
const ELEVENLABS_VOICE_STABILITY = Number(process.env.ELEVENLABS_VOICE_STABILITY || 0.5);
const ELEVENLABS_VOICE_SIMILARITY = Number(process.env.ELEVENLABS_VOICE_SIMILARITY || 0.8);
const ELEVENLABS_VOICE_STYLE = Number(process.env.ELEVENLABS_VOICE_STYLE || 0.1);
const ELEVENLABS_VOICE_SPEED = Number(process.env.ELEVENLABS_VOICE_SPEED || 0.95);
const ELEVENLABS_VOICE_USE_SPEAKER_BOOST = process.env.ELEVENLABS_VOICE_USE_SPEAKER_BOOST !== 'false';
let elevenlabsBlockedUntil = 0;

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const elevenlabsClient = axios.create({
  baseURL: 'https://api.elevenlabs.io/v1',
  timeout: ELEVENLABS_TIMEOUT_MS,
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 20 })
});

const isBlocked = () => Date.now() < elevenlabsBlockedUntil;
const isEnabled = () => process.env.ELEVENLABS_ENABLED === 'true';

const getDefaultVoiceId = () => process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

const resolveVoiceId = (voiceId) => String(voiceId || getDefaultVoiceId()).trim();

const synthesizeSpeech = async (
  text,
  voiceId = getDefaultVoiceId(),
  options = {}
) => {
  if (!isEnabled()) {
    console.warn('ElevenLabs disabled via ELEVENLABS_ENABLED.');
    return {
      audioUrl: null,
      demo_mode: true,
      text
    };
  }

  if (isBlocked()) {
    console.warn('ElevenLabs temporarily blocked, using fallback voice.');
    return {
      audioUrl: null,
      demo_mode: true,
      text
    };
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn('ElevenLabs API key missing, using fallback voice.');
    return {
      audioUrl: null,
      demo_mode: true,
      text
    };
  }

  try {
    const outputFormat = options.outputFormat || ELEVENLABS_OUTPUT_FORMAT;
    const optimizeLatency =
      options.optimizeStreamingLatency ?? ELEVENLABS_OPTIMIZE_STREAMING_LATENCY;

    const query = new URLSearchParams();
    if (outputFormat) query.set('output_format', outputFormat);
    if (optimizeLatency !== undefined && optimizeLatency !== null && String(optimizeLatency).trim() !== '') {
      query.set('optimize_streaming_latency', String(optimizeLatency));
    }

    const endpoint = `/text-to-speech/${resolveVoiceId(voiceId)}${query.toString() ? `?${query.toString()}` : ''}`;

    const voiceSettings = {
      stability: clamp(options.stability ?? ELEVENLABS_VOICE_STABILITY, 0, 1, 0.5),
      similarity_boost: clamp(options.similarityBoost ?? ELEVENLABS_VOICE_SIMILARITY, 0, 1, 0.8),
      style: clamp(options.style ?? ELEVENLABS_VOICE_STYLE, 0, 1, 0.1),
      speed: clamp(options.speed ?? ELEVENLABS_VOICE_SPEED, 0.7, 1.2, 0.95),
      use_speaker_boost: Boolean(
        options.useSpeakerBoost !== undefined ? options.useSpeakerBoost : ELEVENLABS_VOICE_USE_SPEAKER_BOOST
      )
    };

    const response = await elevenlabsClient.post(
      endpoint,
      {
        text,
        model_id: options.modelId || ELEVENLABS_MODEL_ID,
        language_code: options.languageCode || ELEVENLABS_LANGUAGE_CODE,
        apply_text_normalization: options.textNormalization || ELEVENLABS_TEXT_NORMALIZATION,
        voice_settings: voiceSettings
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    console.info(
      `ElevenLabs TTS generated (${response?.data?.byteLength || 0} bytes, model=${options.modelId || ELEVENLABS_MODEL_ID}, lang=${options.languageCode || ELEVENLABS_LANGUAGE_CODE}, format=${outputFormat || 'default'}, latency_opt=${optimizeLatency ?? 'none'}, speed=${voiceSettings.speed}).`
    );

    return {
      audioBuffer: Buffer.from(response.data),
      mimeType: 'audio/mpeg'
    };
  } catch (error) {
    const status = error?.response?.status;
    const body = Buffer.from(error?.response?.data || []).toString('utf8').toLowerCase();

    if (status === 401 && body.includes('detected_unusual_activity')) {
      elevenlabsBlockedUntil = Date.now() + ELEVENLABS_COOLDOWN_MS;
      console.warn(`ElevenLabs blocked (detected_unusual_activity). Disabling ElevenLabs for ${ELEVENLABS_COOLDOWN_MS}ms and using fallback voice.`);
      return {
        audioUrl: null,
        demo_mode: true,
        text
      };
    }

    throw error;
  }
};

const cloneVoiceFromAudio = async ({ name, audioBuffer, fileName, mimeType }) => {
  if (!isEnabled()) {
    throw new Error('ElevenLabs is disabled. Enable ELEVENLABS_ENABLED=true to clone voice.');
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key missing.');
  }

  if (!audioBuffer || !Buffer.isBuffer(audioBuffer) || !audioBuffer.length) {
    throw new Error('Valid audio buffer is required for voice cloning.');
  }

  const form = new FormData();
  form.append('name', String(name || '').trim() || `Saathi Voice ${Date.now()}`);
  form.append('files', audioBuffer, {
    filename: String(fileName || `sample-${Date.now()}.webm`),
    contentType: String(mimeType || 'audio/webm')
  });

  let response;
  try {
    response = await elevenlabsClient.post('/voices/add', form, {
      headers: {
        ...form.getHeaders(),
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
  } catch (error) {
    const status = Number(error?.response?.status || 502);
    const detail = error?.response?.data?.detail;
    const message =
      (typeof detail === 'string' && detail) ||
      detail?.message ||
      detail?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Voice cloning request failed.';

    const wrapped = new Error(
      `Voice cloning failed (${status}): ${message}. Please upload a clear 10-30 second sample (mp3/wav/m4a/webm).`
    );
    wrapped.statusCode = status;
    throw wrapped;
  }

  return {
    voice_id: response?.data?.voice_id,
    name: response?.data?.name || String(name || '').trim() || 'Custom Voice'
  };
};

module.exports = {
  synthesizeSpeech,
  cloneVoiceFromAudio,
  getDefaultVoiceId
};