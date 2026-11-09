// Reddit refuses a burst of writes from the app account with an error like
// `8 RESOURCE_EXHAUSTED: RatelimitError(TimeString="5 seconds")`. New accounts
// with little karma can be told to wait minutes.

// Waits Reddit gives as 10 seconds or less are retried; longer ones aren't,
// since the 30-second handler limit can't fit them. Every wait gets half a
// second added as a margin.
const MARGIN_MS = 500;
const MAX_RETRY_WAIT_MS = 10_000 + MARGIN_MS;
// Used when a rate-limit error doesn't say how long to wait: short enough to retry.
const DEFAULT_WAIT_MS = 5000;

const UNIT_MS: Record<string, number> = { second: 1000, minute: 60_000, hour: 3_600_000 };

/** Thrown when Reddit asks the app to wait longer than a handler can. */
export class RateLimitedError extends Error {
  constructor(readonly untilMs: number) {
    super(`rate-limited by Reddit until ${new Date(untilMs).toISOString()}`);
  }
}

/** How long a rate-limit error asks us to wait, or undefined if it isn't one. */
export function rateLimitWaitMs(error: unknown): number | undefined {
  const message = String(error);
  if (!message.includes('RESOURCE_EXHAUSTED') && !message.includes('RatelimitError')) return undefined;
  const match = /TimeString="(\d+) (second|minute|hour)s?"/.exec(message);
  if (!match) return DEFAULT_WAIT_MS;
  return Number(match[1]) * UNIT_MS[match[2]!]! + MARGIN_MS;
}

/**
 * Runs `action`. If Reddit rate-limits it for 10 seconds or less, waits that
 * long and tries once more. A longer wait, or a second refusal, throws a
 * RateLimitedError saying when the limit ends.
 */
export async function withRateLimitRetry<T>(
  action: () => Promise<T>,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const wait = rateLimitWaitMs(error);
    if (wait === undefined) throw error;
    if (wait > MAX_RETRY_WAIT_MS) throw new RateLimitedError(now() + wait);
    console.log(`Rate-limited by Reddit; retrying in ${wait} ms`);
    await sleep(wait);
    try {
      return await action();
    } catch (retryError) {
      const retryWait = rateLimitWaitMs(retryError);
      if (retryWait === undefined) throw retryError;
      throw new RateLimitedError(now() + retryWait);
    }
  }
}
