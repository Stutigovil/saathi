const twilio = require('twilio');

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

const getTwilioClient = () => {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) {
    throw new Error('TWILIO_SID and TWILIO_TOKEN are required for voice calls');
  }
  return twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
};

const getBaseWebhookUrl = () => {
  const baseUrl =
    normalizeAbsoluteHttpUrl(process.env.PUBLIC_BASE_URL) ||
    normalizeAbsoluteHttpUrl(process.env.BACKEND_PUBLIC_URL) ||
    normalizeAbsoluteHttpUrl(process.env.TWILIO_WEBHOOK_BASE_URL);

  if (!baseUrl) {
    throw new Error(
      'Set PUBLIC_BASE_URL (or BACKEND_PUBLIC_URL / TWILIO_WEBHOOK_BASE_URL) to your public backend URL for Twilio callbacks.'
    );
  }
  return baseUrl;
};

const placeCall = async (elder) => {
  const client = getTwilioClient();
  const from = process.env.TWILIO_VOICE_FROM;

  if (!from) {
    throw new Error('TWILIO_VOICE_FROM is required for Twilio outbound calls');
  }

  const webhookBase = getBaseWebhookUrl();
  const encodedElderId = encodeURIComponent(String(elder._id));

  try {
    const call = await client.calls.create({
      to: elder.phone,
      from,
      url: `${webhookBase}/webhook/twilio/voice?elderId=${encodedElderId}`,
      method: 'POST',
      statusCallback: `${webhookBase}/webhook/twilio/status?elderId=${encodedElderId}`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    return call;
  } catch (error) {
    const allowFallback = process.env.TWILIO_ALLOW_TRIAL_FALLBACK !== 'false';

    if (error?.code === 21219) {
      const message =
        'Twilio trial restriction: destination number is not verified. Verify the number in Twilio Console or upgrade account.';

      if (allowFallback) {
        console.warn(`${message} Using local fallback call mode.`);
        return {
          sid: `twilio-trial-fallback-${Date.now()}`,
          status: 'queued',
          fallback_mode: true,
          fallback_reason: 'twilio_trial_unverified_number'
        };
      }

      const wrapped = new Error(message);
      wrapped.statusCode = 400;
      throw wrapped;
    }

    throw error;
  }
};

const mapTwilioStatusToCallStatus = (twilioStatus) => {
  const value = String(twilioStatus || '').toLowerCase();
  if (value === 'queued' || value === 'initiated' || value === 'ringing') return 'calling';
  if (value === 'in-progress' || value === 'answered') return 'in_progress';
  if (value === 'completed') return 'completed';
  if (value === 'busy' || value === 'no-answer' || value === 'canceled') return 'no_answer';
  if (value === 'failed') return 'error';
  return 'calling';
};

module.exports = {
  placeCall,
  mapTwilioStatusToCallStatus
};