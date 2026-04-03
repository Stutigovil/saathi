const axios = require('axios');

const ELEVENLABS_COOLDOWN_MS = Number(process.env.ELEVENLABS_COOLDOWN_MS || 60 * 60 * 1000);
let elevenlabsBlockedUntil = 0;

const isBlocked = () => Date.now() < elevenlabsBlockedUntil;
const isEnabled = () => process.env.ELEVENLABS_ENABLED === 'true';

const synthesizeSpeech = async (text, voiceId = process.env.ELEVENLABS_VOICE_ID) => {
  if (!isEnabled()) {
    return {
      audioUrl: null,
      demo_mode: true,
      text
    };
  }

  if (isBlocked()) {
    return {
      audioUrl: null,
      demo_mode: true,
      text
    };
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return {
      audioUrl: null,
      demo_mode: true,
      text
    };
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
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

module.exports = {
  synthesizeSpeech
};