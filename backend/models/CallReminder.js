const mongoose = require('mongoose');

const callReminderSchema = new mongoose.Schema(
  {
    elder_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Elder',
      required: true,
      index: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyUser',
      required: true,
      index: true
    },
    call_type: {
      type: String,
      enum: ['reminder', 'followup'],
      default: 'followup'
    },
    scheduled_for: {
      type: Date,
      required: true,
      index: true
    },
    context_topic: { type: String, required: true, trim: true },
    context_notes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'triggered', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true
    },
    call_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Call' },
    provider_call_id: { type: String, trim: true },
    error_message: { type: String, trim: true },
    processed_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  },
  {
    collection: 'call_reminders'
  }
);

callReminderSchema.pre('save', function updateTimestamp(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.models.CallReminder || mongoose.model('CallReminder', callReminderSchema);
