const mongoose = require('mongoose');

const sentToSchema = new mongoose.Schema(
  {
    family_member_name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    delivered: { type: Boolean, default: false },
    delivered_at: { type: Date }
  },
  { _id: false }
);

const alertSchema = new mongoose.Schema(
  {
    elder_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Elder',
      required: true,
      index: true
    },
    call_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call',
      index: true
    },
    type: { type: String, required: true, trim: true },
    urgency: { type: String, required: true, trim: true },
    sent_to: [sentToSchema],
    message_text: { type: String, required: true, trim: true },
    twilio_sid: { type: String, trim: true },
    sent_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now }
  },
  {
    collection: 'alerts'
  }
);

module.exports = mongoose.models.Alert || mongoose.model('Alert', alertSchema);