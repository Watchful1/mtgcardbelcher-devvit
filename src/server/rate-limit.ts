// Reddit refuses a burst of writes from the app account with an error like
// `8 RESOURCE_EXHAUSTED: RatelimitError(TimeString="5 seconds")`.

const MAX_WAIT_MS = 10_000;

/** How long a rate-limit error asks us to wait, or undefined if it isn't one. */
export function rateLimitWaitMs(error: unknown): number | undefined {
  const message = String(error);
  if (!message.includes('RESOURCE_EXHAUSTED') && !message.includes('RatelimitError')) return undefined;
  const seconds = /TimeString="(\d+) seconds?"/.exec(message)?.[1];
  return Math.min(seconds ? Number(seconds) * 1000 + 500 : 5000, MAX_WAIT_MS);
}

/**
 * Runs `action`, and if Reddit rate-limits it, waits as long as Reddit asks
 * (at most 10 seconds, to stay inside the 30-second handler limit) and tries
 * once more.
 */
export async function withRateLimitRetry<T>(
  action: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const wait = rateLimitWaitMs(error);
    if (wait === undefined) throw error;
    console.log(`Rate-limited by Reddit; retrying in ${wait} ms`);
    await sleep(wait);
    return action();
  }
}
