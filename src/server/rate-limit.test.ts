import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RateLimitedError, rateLimitWaitMs, withRateLimitRetry } from './rate-limit';

const NOW = 1_800_000_000_000;
const now = () => NOW;
const limited = (time: string) => new Error(`8 RESOURCE_EXHAUSTED: RatelimitError(TimeString="${time}")`);

test('rateLimitWaitMs reads seconds and minutes from Reddit', () => {
  assert.equal(rateLimitWaitMs(limited('5 seconds')), 5500);
  assert.equal(rateLimitWaitMs(limited('1 second')), 1500);
  assert.equal(rateLimitWaitMs(limited('9 minutes')), 540_500);
  assert.equal(rateLimitWaitMs(limited('2 hours')), 7_200_500);
  assert.equal(rateLimitWaitMs(new Error('RESOURCE_EXHAUSTED')), 5000, 'no wait given: retry soon');
  assert.equal(rateLimitWaitMs(new Error('5 NOT_FOUND')), undefined);
});

test('a short rate limit is waited out and retried once', async () => {
  const waits: number[] = [];
  let calls = 0;
  const result = await withRateLimitRetry(
    async () => {
      if (++calls === 1) throw limited('5 seconds');
      return 'ok';
    },
    now,
    async (ms) => {
      waits.push(ms);
    },
  );
  assert.equal(result, 'ok');
  assert.deepEqual(waits, [5500]);
});

test('a 10-second rate limit is still retried', async () => {
  let calls = 0;
  await withRateLimitRetry(
    async () => {
      if (++calls === 1) throw limited('10 seconds');
    },
    now,
    async () => {},
  );
  assert.equal(calls, 2);
});

test('a long rate limit is not retried, and says when it ends', async () => {
  let calls = 0;
  const failure = withRateLimitRetry(async () => {
    calls++;
    throw limited('9 minutes');
  }, now);
  await assert.rejects(failure, (error) => error instanceof RateLimitedError && error.untilMs === NOW + 540_500);
  assert.equal(calls, 1);
});

test('a second refusal after the retry ends with a RateLimitedError', async () => {
  await assert.rejects(
    withRateLimitRetry(
      async () => {
        throw limited('5 seconds');
      },
      now,
      async () => {},
    ),
    RateLimitedError,
  );
});

test('other errors pass straight through', async () => {
  await assert.rejects(
    withRateLimitRetry(async () => {
      throw new Error('5 NOT_FOUND');
    }),
    /NOT_FOUND/,
  );
});
