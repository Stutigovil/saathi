const mongoose = require('mongoose');

const armorIQBlockSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    timestamp: { type: Date, required: true, default: Date.now },
    rule_id: { type: String, required: true, trim: true },
    severity: { type: String, required: true, trim: true },
    original_intent: { type: String, required: true, trim: true },
    action_taken: { type: String, required: true, trim: true },
    response_used: { type: String, trim: true },
    created_at: { type: Date, default: Date.now }
  },
  {
    collection: 'armoriq_blocks'
  }
);

module.exports = mongoose.models.ArmorIQBlock || mongoose.model('ArmorIQBlock', armorIQBlockSchema);