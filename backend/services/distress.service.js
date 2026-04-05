const Alert = require('../models/Alert');
const { generateDistressAlert } = require('./gemini.service');
const { sendWhatsAppMessage } = require('./whatsapp.service');

const toSafeMessageText = (value, fallback) => {
  const text = String(value || '').trim();
  if (text) return text;
  return String(fallback || 'Sathi update: Please check in with your elder.').trim();
};

const evaluateDistress = (callData) => {
  const distressScore = Number(callData?.final_distress_score || 0);
  const moodScore = Number(callData?.final_mood_score || 0);

  const shouldAlert = callData?.distress_detected || distressScore >= 7 || moodScore <= 3;
  const urgency = distressScore >= 8 || moodScore <= 2 ? 'high' : shouldAlert ? 'medium' : 'low';

  return {
    shouldAlert,
    urgency,
    distressScore,
    moodScore
  };
};

const sendDistressAlert = async (elder, summary) => {
  const primaryContacts = (elder.family || []).filter((member) => member.is_primary);
  const recipients = primaryContacts.length ? primaryContacts : elder.family || [];

  const deliveries = [];
  let twilioSid = null;
  let messageText = '';

  for (const member of recipients) {
    messageText = toSafeMessageText(
      await generateDistressAlert(elder.name, member.name, summary, []),
      `Sathi alert: ${elder.name} ji may need support. Please check in as soon as possible.`
    );

    const message = await sendWhatsAppMessage({
      to: member.whatsapp || member.phone,
      body: messageText
    });

    twilioSid = twilioSid || message.sid;
    deliveries.push({
      family_member_name: member.name,
      phone: member.whatsapp || member.phone,
      delivered: true,
      delivered_at: new Date()
    });
  }

  messageText = toSafeMessageText(
    messageText,
    `Sathi alert: ${elder.name} ji may need support. Please check in as soon as possible.`
  );

  const alert = await Alert.create({
    elder_id: elder._id,
    type: 'distress',
    urgency: 'high',
    sent_to: deliveries,
    message_text: messageText,
    twilio_sid: twilioSid,
    sent_at: new Date(),
    created_at: new Date()
  });

  return alert;
};

const sendMissedCallAlert = async (elder, missedDays) => {
  const urgency = missedDays >= 5 ? 'high' : missedDays >= 3 ? 'medium' : 'low';
  const messageText = toSafeMessageText(
    urgency === 'high'
      ? `Sathi update: ${elder.name} ji ne ${missedDays} din se call receive nahi kiya. Kripya aaj unse zarur baat karein.`
      : `Sathi update: ${elder.name} ji ne ${missedDays} din se call miss kiya hai. Aap unhe check-in call kar sakte hain.`,
    `Sathi update: ${elder.name} ji missed calls recently. Please check in today.`
  );

  const sentTo = [];
  let twilioSid = null;

  for (const member of elder.family || []) {
    const message = await sendWhatsAppMessage({
      to: member.whatsapp || member.phone,
      body: messageText
    });

    twilioSid = twilioSid || message.sid;
    sentTo.push({
      family_member_name: member.name,
      phone: member.whatsapp || member.phone,
      delivered: true,
      delivered_at: new Date()
    });
  }

  return Alert.create({
    elder_id: elder._id,
    type: 'missed_call',
    urgency,
    sent_to: sentTo,
    message_text: messageText,
    twilio_sid: twilioSid,
    sent_at: new Date(),
    created_at: new Date()
  });
};

const sendWeeklySummary = async (elder, weeklySummary) => {
  const safeWeeklySummary = toSafeMessageText(
    weeklySummary,
    `Sathi weekly update: ${elder.name} ji ke liye is hafte ka summary tayyar hai. Kripya dashboard check karein.`
  );

  const sentTo = [];
  let twilioSid = null;

  for (const member of elder.family || []) {
    const message = await sendWhatsAppMessage({
      to: member.whatsapp || member.phone,
      body: safeWeeklySummary
    });

    twilioSid = twilioSid || message.sid;
    sentTo.push({
      family_member_name: member.name,
      phone: member.whatsapp || member.phone,
      delivered: true,
      delivered_at: new Date()
    });
  }

  return Alert.create({
    elder_id: elder._id,
    type: 'weekly_summary',
    urgency: 'low',
    sent_to: sentTo,
    message_text: safeWeeklySummary,
    twilio_sid: twilioSid,
    sent_at: new Date(),
    created_at: new Date()
  });
};

const sendNoPickupAlert = async (elder, scheduleTime) => {
  const messageText = toSafeMessageText(
    `Sathi update: ${elder.name} ji ne aaj ${scheduleTime} aur 10 minute baad retry call dono receive nahi kiye. Mood score 0 mark kiya gaya hai. Kripya unse jaldi contact karein.`,
    `Sathi update: ${elder.name} ji missed today's calls. Mood score set to 0. Please contact them soon.`
  );

  const sentTo = [];
  let twilioSid = null;

  for (const member of elder.family || []) {
    const message = await sendWhatsAppMessage({
      to: member.whatsapp || member.phone,
      body: messageText
    });

    twilioSid = twilioSid || message.sid;
    sentTo.push({
      family_member_name: member.name,
      phone: member.whatsapp || member.phone,
      delivered: true,
      delivered_at: new Date()
    });
  }

  return Alert.create({
    elder_id: elder._id,
    type: 'no_pickup',
    urgency: 'medium',
    sent_to: sentTo,
    message_text: messageText,
    twilio_sid: twilioSid,
    sent_at: new Date(),
    created_at: new Date()
  });
};

module.exports = {
  evaluateDistress,
  sendDistressAlert,
  sendMissedCallAlert,
  sendWeeklySummary,
  sendNoPickupAlert
};