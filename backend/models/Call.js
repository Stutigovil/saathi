const mongoose = require('mongoose');

const armorIQBlockSchema = new mongoose.Schema(
  {
    rule_id: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
    original_intent: { type: String, trim: true },
    action_taken: { type: String, trim: true },
    redirected_to: { type: String, trim: true }
  },
  { _id: false }
);

const callSchema = new mongoose.Schema(
  {
    elder_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Elder',
      required: true,
      index: true
    },
    vapi_call_id: {
      type: String,
      trim: true,
      default: function () {
        return this.provider_call_id;
      }
    },
    provider_call_id: { type: String, required: true, unique: true, trim: true },
    started_at: { type: Date },
    ended_at: { type: Date },
    duration_seconds: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['scheduled', 'calling', 'in_progress', 'completed', 'no_answer', 'error'],
      default: 'scheduled'
    },
    attempt_number: { type: Number, default: 1 },
    transcript: { type: String, trim: true },
    voice_id: { type: String, trim: true },
    base_system_prompt: { type: String, trim: true },
    dynamic_prompt_state: { type: String, trim: true },
    exchange_count: { type: Number, default: 0 },
    final_mood_score: { type: Number, min: 0, max: 10 },
    final_distress_score: { type: Number, min: 0, max: 10 },
    distress_detected: { type: Boolean, default: false },
    armoriq_blocks: [armorIQBlockSchema],
    family_alert_sent: { type: Boolean, default: false },
    family_alert_type: { type: String, trim: true },
    memory_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Memory' },
    created_at: { type: Date, default: Date.now }
  },
  {
    collection: 'calls'
  }
);

module.exports = mongoose.models.Call || mongoose.model('Call', callSchema);