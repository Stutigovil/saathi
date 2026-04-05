const mongoose = require('mongoose');

const familyUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    password_hash: { type: String, required: true },
    family_profile: {
      member_name: { type: String, trim: true, default: '' },
      relationship_with_elder: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      whatsapp: { type: String, trim: true, default: '' },
      platform_reason: { type: String, trim: true, default: '' }
    },
    profile_completed: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  },
  {
    collection: 'family_users'
  }
);

familyUserSchema.pre('save', function updateTimestamp(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.models.FamilyUser || mongoose.model('FamilyUser', familyUserSchema);
