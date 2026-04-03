const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
  {
    elder_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Elder',
      required: true,
      index: true
    },
    date: { type: Date, required: true, default: Date.now },
    summary: { type: String, required: true, trim: true },
    mood_score: { type: Number, required: true, min: 0, max: 10 },
    mood_label: { type: String, required: true, trim: true },
    key_topics: [{ type: String, trim: true }],
    people_mentioned: [{ type: String, trim: true }],
    health_mentions: [{ type: String, trim: true }],
    important_details: [{ type: String, trim: true }],
    follow_up_questions: [{ type: String, trim: true }],
    distress_detected: { type: Boolean, default: false },
    distress_reason: { type: String, trim: true },
    call_duration_minutes: { type: Number, default: 0 },
    call_quality: { type: String, trim: true },
    created_at: { type: Date, default: Date.now }
  },
  {
    collection: 'memories'
  }
);

memorySchema.index({ elder_id: 1, date: -1 });

module.exports = mongoose.models.Memory || mongoose.model('Memory', memorySchema);