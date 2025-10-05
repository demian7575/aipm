export type GuidanceLevel = 'pass' | 'warn' | 'fail';

export interface GuidanceCheck {
  id: string;
  label: string;
  level: GuidanceLevel;
  message: string;
}

export interface GuidanceReport {
  summary: string;
  level: GuidanceLevel;
  checks: GuidanceCheck[];
}

export type GuidanceContext = 'mergeRequest' | 'userStory' | 'acceptanceTest';
