const ArmorIQBlock = require('../models/ArmorIQBlock');

const ARMORIQ_RULES = {
  NO_MEDICAL_ADVICE: {
    trigger_patterns: ['dawai', 'medicine', 'pain killer', 'dose', 'ilaaj', 'treatment'],
    action: 'REDIRECT',
    severity: 'medium',
    redirect_response: 'Yeh doctor ji better bata paayenge. Aap unse zarur milna. Abhi kaisa lag raha hai?'
  },
  NO_PII_LEAKAGE: {
    trigger_patterns: ['otp', 'aadhaar', 'bank number', 'pin', 'account details'],
    action: 'BLOCK',
    severity: 'high',
    redirect_response: 'Main personal ya sensitive jaankari share nahi kar sakti. Chaliye aapke din ke baare mein baat karte hain.'
  },
  HONEST_AI_DISCLOSURE: {
    trigger_patterns: ['insaan ho', 'human ho', 'real person', 'kaun bol raha'],
    action: 'DISCLOSE',
    severity: 'low',
    redirect_response: 'Main Sathi, ek AI companion hoon, jo roz aapse pyaar se baat karne ke liye yahan hai.'
  },
  DISTRESS_ESCALATION: {
    trigger_patterns: ['jeene ka mann nahi', 'hopeless', 'akela mar jaunga', 'suicide', 'khatam karna'],
    action: 'ESCALATE',
    severity: 'critical',
    redirect_response: 'Main aapke saath hoon. Aap akelay nahi hain. Main turant aapke parivaar ko gently inform karti hoon taaki woh aapse baat kar sakein.'
  },
  NO_FINANCIAL_ADVICE: {
    trigger_patterns: ['investment', 'shares', 'loan', 'mutual fund', 'stock', 'paise kaha lagau'],
    action: 'REDIRECT',
    severity: 'medium',
    redirect_response: 'Paise ke faisle ke liye trusted financial advisor se baat karna behtar rahega. Aaj aapka din kaisa raha?'
  }
};

const checkResponse = async (responseText, elder) => {
  const normalized = String(responseText || '').toLowerCase();

  for (const [ruleId, rule] of Object.entries(ARMORIQ_RULES)) {
    const matchedPattern = rule.trigger_patterns.find((pattern) => normalized.includes(pattern.toLowerCase()));
    if (matchedPattern) {
      return {
        passed: false,
        rule_triggered: ruleId,
        action: rule.action,
        safe_response: rule.redirect_response,
        severity: rule.severity,
        original_intent: responseText,
        elder_id: elder?._id
      };
    }
  }

  return {
    passed: true,
    rule_triggered: null,
    action: 'ALLOW',
    safe_response: responseText,
    severity: 'none'
  };
};

const logBlock = async (elderId, callId, blockData) => {
  return ArmorIQBlock.create({
    elder_id: elderId,
    call_id: callId,
    timestamp: blockData.timestamp || new Date(),
    rule_id: blockData.rule_triggered,
    severity: blockData.severity || 'medium',
    original_intent: blockData.original_intent || '',
    action_taken: blockData.action || 'BLOCK',
    response_used: blockData.safe_response || '',
    created_at: new Date()
  });
};

module.exports = {
  ARMORIQ_RULES,
  checkResponse,
  logBlock
};