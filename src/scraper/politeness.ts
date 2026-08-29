export interface ChainPoliteness {
  delayMs: number;
  allowedHoursUtc?: [number, number];
}

// Regler bekräftade mot respektive kedjas robots.txt (se planen, Fas 2 avsnitt 1).
export const CHAIN_POLITENESS: Record<string, ChainPoliteness> = {
  WILLYS: { delayMs: 10_000, allowedHoursUtc: [4, 8.75] },
  ICA: { delayMs: 3_000 },
  COOP: { delayMs: 3_000 },
  LIDL: { delayMs: 3_000 },
};

export function isWithinAllowedWindow(chain: string, now: Date = new Date()): boolean {
  if (process.env.SCRAPER_IGNORE_TIME_WINDOW === "true") return true;

  const config = CHAIN_POLITENESS[chain];
  if (!config?.allowedHoursUtc) return true;

  const hourUtc = now.getUTCHours() + now.getUTCMinutes() / 60;
  const [start, end] = config.allowedHoursUtc;
  return hourUtc >= start && hourUtc <= end;
}

export function delayFor(chain: string): number {
  return CHAIN_POLITENESS[chain]?.delayMs ?? 5_000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
