const axios = require('axios');
const FormData = require('form-data');

const ELEVENLABS_COOLDOWN_MS = Number(process.env.ELEVENLABS_COOLDOWN_MS || 60 * 60 * 1000);
let elevenlabsBlockedUntil = 0;

const isBlocked = () => Date.now() < elevenlabsBlockedUntil;
const isEnabled = () => process.env.ELEVENLABS_ENABLED === 'true';

const getDefaultVoiceId = () => process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

const synthesizeSpeech = async (text, voiceId = getDefaultVoiceId()) => {
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

  const requestTts = async (targetVoiceId) => {
    console.info(`ElevenLabs TTS request voice_id=${targetVoiceId}`);
    return axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 20000
      }
    );
  };

  try {
    const response = await requestTts(voiceId);

    console.info(`ElevenLabs TTS generated (${response?.data?.byteLength || 0} bytes).`);

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

    const defaultVoice = getDefaultVoiceId();
    if (voiceId && voiceId !== defaultVoice) {
      console.warn('ElevenLabs voice failed, retrying with default voice.');
      try {
        const response = await requestTts(defaultVoice);
        console.info(`ElevenLabs TTS generated (${response?.data?.byteLength || 0} bytes).`);
        return {
          audioBuffer: Buffer.from(response.data),
          mimeType: 'audio/mpeg'
        };
      } catch (fallbackError) {
        throw fallbackError;
      }
    }

    throw error;
  }
};

const createVoiceClone = async ({ name, fileBuffer, fileName, contentType }) => {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key missing');
  }

  const form = new FormData();
  form.append('name', String(name || 'UserVoice'));
  form.append('files', fileBuffer, {
    filename: fileName || 'voice-sample.wav',
    contentType: contentType || 'audio/wav'
  });

  const response = await axios.post('https://api.elevenlabs.io/v1/voices/add', form, {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      ...form.getHeaders()
    },
    timeout: 20000
  });

  return response?.data?.voice_id;
};

module.exports = {
  synthesizeSpeech,
  createVoiceClone
};