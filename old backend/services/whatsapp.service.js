const twilio = require('twilio');

const getTwilioClient = () => {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) {
    return null;
  }

  return twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
};

const sendWhatsAppMessage = async ({ to, body }) => {
  const client = getTwilioClient();

  if (!client) {
    return {
      sid: `demo-whatsapp-${Date.now()}`,
      status: 'queued',
      demo_mode: true,
      to,
      body
    };
  }

  const message = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
    body
  });

  return message;
};

module.exports = {
  sendWhatsAppMessage
};