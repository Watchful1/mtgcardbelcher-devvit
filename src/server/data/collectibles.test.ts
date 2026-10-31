import assert from 'node:assert/strict';
import { test } from 'node:test';

import { COLLECTIBLES, firstCalledCollectible, renderArt } from './collectibles';

const [dreadmaw, stormCrow] = COLLECTIBLES;

test('firstCalledCollectible goes by call order and ignores case', () => {
  assert.equal(firstCalledCollectible(['Bolt', 'STORM CROW', 'colossal dreadmaw']), stormCrow);
  assert.equal(firstCalledCollectible(['Bolt']), undefined);
});

test('renderArt stamps a zero-padded collector number in both places', () => {
  const art = renderArt(dreadmaw!, 42);
  assert.equal(art.match(/0042/g)?.length, 2);
  assert.ok(!art.includes('{{COUNT}}'));
  assert.ok(art.includes('You are No. 0042 to encounter Colossal Dreadmaw!'));
});

test('renderArt refuses numbers over 9999', () => {
  assert.throws(() => renderArt(dreadmaw!, 10_000));
});
