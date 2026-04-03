const { getSathiSystemPrompt } = require('../prompts/sathi.prompts');

const MAX_PROMPT_STATE_CHARS = Number(process.env.PROMPT_STATE_MAX_CHARS || 4000);

const buildBasePrompt = (elder, memoryContext) => {
  return getSathiSystemPrompt(elder, memoryContext || 'No memory context available yet.');
};

const getEffectiveSystemPrompt = ({ basePrompt, dynamicPromptState }) => {
  const dynamic = String(dynamicPromptState || '').trim();
  if (dynamic) return dynamic;
  return String(basePrompt || '').trim();
};

const sanitizeDynamicPromptState = (value) => {
  const cleaned = String(value || '').replace(/```[\s\S]*?```/g, '').trim();
  if (!cleaned) return '';
  return cleaned.slice(0, MAX_PROMPT_STATE_CHARS);
};

const ensureBasePrompt = ({ call, elder, memoryContext }) => {
  if (!call || call.base_system_prompt) return call?.base_system_prompt || '';
  const basePrompt = buildBasePrompt(elder, memoryContext);
  call.base_system_prompt = basePrompt;
  return basePrompt;
};

module.exports = {
  buildBasePrompt,
  ensureBasePrompt,
  getEffectiveSystemPrompt,
  sanitizeDynamicPromptState
};
