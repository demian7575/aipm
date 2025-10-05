let seed = Date.now();

export function createId(prefix: string): string {
  seed += 1;
  return `${prefix}-${seed.toString(36)}`;
}
