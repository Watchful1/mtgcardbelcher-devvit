import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rateLimitWaitMs, withRateLimitRetry } from './rate-limit';

const RATE_LIMITED = new Error('8 RESOURCE_EXHAUSTED: RatelimitError(TimeString="5 seconds")');

test('rateLimitWaitMs reads the wait from Reddit, capped at 10 seconds', () => {
  assert.equal(rateLimitWaitMs(RATE_LIMITED), 5500);
  assert.equal(rateLimitWaitMs(new Error('RatelimitError(TimeString="9 minutes")')), 5000);
  assert.equal(rateLimitWaitMs(new Error('RESOURCE_EXHAUSTED: RatelimitError(TimeString="60 seconds")')), 10_000);
  assert.equal(rateLimitWaitMs(new Error('5 NOT_FOUND')), undefined);
});

test('withRateLimitRetry waits and tries once more after a rate limit', async () => {
  const waits: number[] = [];
  let calls = 0;
  const result = await withRateLimitRetry(
    async () => {
      if (++calls === 1) throw RATE_LIMITED;
      return 'ok';
    },
    async (ms) => {
      waits.push(ms);
    },
  );
  assert.equal(result, 'ok');
  assert.deepEqual(waits, [5500]);
});

test('withRateLimitRetry passes other errors straight through', async () => {
  await assert.rejects(
    withRateLimitRetry(async () => {
      throw new Error('5 NOT_FOUND');
    }),
    /NOT_FOUND/,
  );
});
