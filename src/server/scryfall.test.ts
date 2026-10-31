import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cardImages, lookupCards, randomFlavour } from './scryfall';

function fakeFetch(body: unknown, status = 200): { fetch: typeof fetch; requests: { url: string; init: RequestInit }[] } {
  const requests: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { fetch: fn, requests };
}

test('cardImages: single-faced, double-faced and content-warning cards', () => {
  assert.deepEqual(cardImages({ image_uris: { normal: 'one' } }), ['one']);
  assert.deepEqual(cardImages({ card_faces: [{ image_uris: { normal: 'f' } }, { image_uris: { normal: 'b' } }] }), ['f', 'b']);
  // Split cards have faces but one shared image.
  assert.deepEqual(cardImages({ image_uris: { normal: 'split' }, card_faces: [{}, {}] }), ['split']);
  assert.deepEqual(cardImages({ content_warning: true, image_uris: { normal: 'one' } }), []);
});

test('lookupCards sends one request and maps results back past not_found', async () => {
  const { fetch, requests } = fakeFetch({
    data: [
      { image_uris: { normal: 'bolt' } },
      { card_faces: [{ image_uris: { normal: 'delver' } }, { image_uris: { normal: 'insectile' } }] },
    ],
    not_found: [{ name: 'my made-up card' }],
  });
  const found = await lookupCards(['Lightning Bolt', 'My Made-Up Card', 'Delver of Secrets', 'lightning bolt'], fetch);

  assert.equal(requests.length, 1);
  assert.deepEqual(JSON.parse(String(requests[0]!.init.body)), {
    identifiers: [{ name: 'lightning bolt' }, { name: 'my made-up card' }, { name: 'delver of secrets' }],
  });
  assert.deepEqual([...found], [
    ['lightning bolt', ['bolt']],
    ['delver of secrets', ['delver', 'insectile']],
  ]);
});

test('lookupCards looks up split cards by their first face', async () => {
  const { fetch, requests } = fakeFetch({ data: [{ image_uris: { normal: 'fire-ice' } }], not_found: [] });
  const found = await lookupCards(['Fire // Ice'], fetch);
  assert.deepEqual(JSON.parse(String(requests[0]!.init.body)), { identifiers: [{ name: 'fire' }] });
  assert.deepEqual(found.get('fire // ice'), ['fire-ice']);
});

test('lookupCards returns nothing when Scryfall fails', async () => {
  assert.equal((await lookupCards(['Bolt'], fakeFetch({}, 500).fetch)).size, 0);
  const throwing = (async () => {
    throw new Error('refused');
  }) as unknown as typeof fetch;
  assert.equal((await lookupCards(['Bolt'], throwing)).size, 0);
});

test('randomFlavour reads the card or its faces', async () => {
  assert.equal(await randomFlavour(fakeFetch({ flavor_text: 'It burns.' }).fetch), 'It burns.');
  assert.equal(await randomFlavour(fakeFetch({ card_faces: [{}, { flavor_text: 'Back.' }] }).fetch), 'Back.');
  assert.equal(await randomFlavour(fakeFetch({}, 404).fetch), undefined);
});
