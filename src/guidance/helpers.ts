import { GuidanceCheck, GuidanceLevel } from './types';

export function deriveLevel(checks: GuidanceCheck[]): GuidanceLevel {
  if (checks.some((check) => check.level === 'fail')) {
    return 'fail';
  }
  if (checks.some((check) => check.level === 'warn')) {
    return 'warn';
  }
  return 'pass';
}

export function hasVagueLanguage(text: string): boolean {
  const vagueTerms = ['quickly', 'easily', 'seamlessly', 'nice', 'good', 'better', 'optimize'];
  const lower = text.toLowerCase();
  return vagueTerms.some((term) => lower.includes(term));
}

export function hasConjunctionChain(text: string): boolean {
  return /(\band\b|,\s*and)/i.test(text);
}
