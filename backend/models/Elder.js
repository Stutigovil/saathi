const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    is_primary: { type: Boolean, default: false }
  },
  { _id: false }
);

const knownInfoSchema = new mongoose.Schema(
  {
    health_conditions: [{ type: String, trim: true }],
    likes: [{ type: String, trim: true }],
    dislikes: [{ type: String, trim: true }],
    important_people: [{ type: String, trim: true }],
    routine: { type: String, trim: true },
    notes_from_family: { type: String, trim: true }
  },
  { _id: false }
);

const statsSchema = new mongoose.Schema(
  {
    total_calls: { type: Number, default: 0 },
    total_call_minutes: { type: Number, default: 0 },
    average_mood: { type: Number, default: 0 },
    distress_alerts_sent: { type: Number, default: 0 },
    consecutive_missed_calls: { type: Number, default: 0 },
    last_successful_call: { type: Date }
  },
  { _id: false }
);

const elderSchema = new mongoose.Schema(
  {
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FamilyUser',
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 1 },
    phone: { type: String, required: true, unique: true, trim: true },
    city: { type: String, required: true, trim: true },
    language: { type: String, default: 'Hindi', trim: true },
    schedule_time: { type: String, default: '18:00', trim: true },
    schedule_days: [{ type: String, trim: true }],
    is_active: { type: Boolean, default: true },
    voice_id: { type: String, trim: true },
    voice_name: { type: String, trim: true },
    family: [familyMemberSchema],
    known_info: { type: knownInfoSchema, default: () => ({}) },
    stats: { type: statsSchema, default: () => ({}) },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  },
  {
    collection: 'elders'
  }
);

elderSchema.pre('save', function updateTimestamp(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.models.Elder || mongoose.model('Elder', elderSchema);