export const MAX_DEPTH = Number(process.env.AI_PM_MAX_DEPTH ?? '4');
export const INVEST_POLICY = (process.env.AI_PM_INVEST_POLICY as 'warn' | 'block') ?? 'warn';
