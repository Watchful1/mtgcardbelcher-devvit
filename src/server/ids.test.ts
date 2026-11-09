import assert from 'node:assert/strict';
import { test } from 'node:test';

import { asCommentId, asPostId } from './ids';

test('ids get their prefix once', () => {
  assert.equal(asCommentId('abc'), 't1_abc');
  assert.equal(asCommentId('t1_abc'), 't1_abc');
  assert.equal(asPostId('abc'), 't3_abc');
  assert.equal(asPostId('t3_abc'), 't3_abc');
});
