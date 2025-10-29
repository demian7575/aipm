const PERSONAL_ENV_CANDIDATES = [
  'AI_PM_CODEX_PERSONAL_URL',
  'CODEX_PERSONAL_URL',
  'AI_PM_CODEX_URL',
  'CODEX_URL',
  'AI_CODER_PERSONAL_URL',
  'AI_CODER_URL',
];

export function findConfiguredPersonalCodexUrl(env = process.env) {
  if (!env) {
    return null;
  }

  for (const key of PERSONAL_ENV_CANDIDATES) {
    const value = env[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return { key, value: trimmed };
      }
    }
  }

  return null;
}

export function getPersonalCodexEnvCandidates() {
  return [...PERSONAL_ENV_CANDIDATES];
}

export default {
  findConfiguredPersonalCodexUrl,
  getPersonalCodexEnvCandidates,
};
