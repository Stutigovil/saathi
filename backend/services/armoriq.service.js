const ArmorIQBlock = require('../models/ArmorIQBlock');

const ARMORIQ_RULES = {
  NO_MEDICAL_ADVICE: {
    apply_on: 'both',
    trigger_patterns: [
      'dawai',
      'davai',
      'medicine',
      'pain killer',
      'dose',
      'ilaaj',
      'treatment',
      'दवाई',
      'दवा',
      'इलाज',
      'मेडिसिन',
      'गोली'
    ],
    action: 'REDIRECT',
    severity: 'medium',
    redirect_response: 'Yeh doctor ji better bata paayenge. Aap unse zarur milna. Abhi kaisa lag raha hai?'
  },
  NO_PII_LEAKAGE: {
    apply_on: 'both',
    trigger_patterns: [
      'otp',
      'aadhaar',
      'bank number',
      'pin',
      'account details',
      'ओटीपी',
      'आधार',
      'बैंक',
      'पिन',
      'खाता नंबर'
    ],
    action: 'BLOCK',
    severity: 'high',
    redirect_response: 'Main personal ya sensitive jaankari share nahi kar sakti. Chaliye aapke din ke baare mein baat karte hain.'
  },
  HONEST_AI_DISCLOSURE: {
    apply_on: 'user',
    trigger_patterns: ['insaan ho', 'human ho', 'real person', 'kaun bol raha'],
    action: 'DISCLOSE',
    severity: 'low',
    redirect_response: 'Main Sathi, ek AI companion hoon, jo roz aapse pyaar se baat karne ke liye yahan hai.'
  },
  DISTRESS_ESCALATION: {
    apply_on: 'user',
    trigger_patterns: [
      'jeene ka mann nahi',
      'hopeless',
      'akela mar jaunga',
      'suicide',
      'khatam karna',
      'mar jaunga',
      'mar jaungi',
      'zeher',
      'zahar',
      'jaan dena'
    ],
    action: 'ESCALATE',
    severity: 'critical',
    redirect_response: 'Main aapke saath hoon. Aap akelay nahi hain. Main turant aapke parivaar ko gently inform karti hoon taaki woh aapse baat kar sakein.'
  },
  NO_FINANCIAL_ADVICE: {
    apply_on: 'both',
    trigger_patterns: [
      'investment',
      'shares',
      'loan',
      'mutual fund',
      'stock',
      'paise kaha lagau',
      'निवेश',
      'लोन',
      'शेयर',
      'स्टॉक',
      'पैसे कहाँ लगाऊ'
    ],
    action: 'REDIRECT',
    severity: 'medium',
    redirect_response: 'Paise ke faisle ke liye trusted financial advisor se baat karna behtar rahega. Aaj aapka din kaisa raha?'
  }
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const textContainsPattern = (text, pattern) => {
  const normalizedText = normalizeText(text);
  const normalizedPattern = normalizeText(pattern);
  if (!normalizedPattern) return false;
  return normalizedText.includes(normalizedPattern);
};

const checkResponse = async (responseText, elder, userText = '') => {
  const assistantText = String(responseText || '');
  const userInput = String(userText || '');

  for (const [ruleId, rule] of Object.entries(ARMORIQ_RULES)) {
    const applyOn = rule.apply_on || 'assistant';
    const targetTexts =
      applyOn === 'user'
        ? [{ text: userInput, matchedOn: 'user' }]
        : applyOn === 'both'
          ? [
              { text: userInput, matchedOn: 'user' },
              { text: assistantText, matchedOn: 'assistant' }
            ]
          : [{ text: assistantText, matchedOn: 'assistant' }];

    let matchedPattern = null;
    let matchedOn = null;

    for (const target of targetTexts) {
      const found = rule.trigger_patterns.find((pattern) => textContainsPattern(target.text, pattern));
      if (found) {
        matchedPattern = found;
        matchedOn = target.matchedOn;
        break;
      }
    }

    if (matchedPattern) {
      return {
        passed: false,
        rule_triggered: ruleId,
        action: rule.action,
        safe_response: rule.redirect_response,
        severity: rule.severity,
        original_intent: matchedOn === 'user' ? userInput : assistantText,
        elder_id: elder?._id,
        matched_on: matchedOn,
        matched_pattern: matchedPattern
      };
    }
  }

  return {
    passed: true,
    rule_triggered: null,
    action: 'ALLOW',
    safe_response: assistantText,
    severity: 'none',
    matched_on: null,
    matched_pattern: null
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