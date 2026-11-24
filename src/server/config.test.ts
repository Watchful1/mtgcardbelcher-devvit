import assert from 'node:assert/strict';
import { test } from 'node:test';

import { collectorNumberOr, isDryRun } from './config';

test('only "false" turns dry run off', () => {
  for (const off of ['false', ' False ', false]) assert.equal(isDryRun(off), false);
  for (const on of ['true', true, '', 'no', undefined]) assert.equal(isDryRun(on), true);
});

test('a collector number setting must be a whole number of 0 or more', () => {
  assert.equal(collectorNumberOr(200, 143), 200);
  assert.equal(collectorNumberOr(0, 143), 0);
  for (const bad of [143.5, -1, NaN, Infinity, undefined, '200']) assert.equal(collectorNumberOr(bad, 143), 143);
});
