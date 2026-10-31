import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';

import { createCounterComments, store } from '../server/platform';
import { poolTick } from '../server/pool-tick';

export const menu = new Hono();

// Re-reads the newest 1,000 r/MTGCardBelcher posts, dropping images that were
// reflaired or deleted since they were added. The reset itself happens inside
// the locked tick, so it can't interleave with a run already in progress.
menu.post('/rebuild-pool', async (c) => {
  await store().requestReset();
  await poolTick();
  return c.json<UiResponse>({ showToast: 'Rebuilding the image pool. It can take up to half an hour to finish.' }, 200);
});

// Posts one counter comment per collectible under the chosen post, as the app
// account, so the app can edit them. Their ids go in the log, to be set with
// `devvit settings set <collectible>CounterCommentId`.
menu.post('/create-counters', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  try {
    await createCounterComments(request.targetId);
    return c.json<UiResponse>({ showToast: 'Created 3 collector counter comments. Their ids are in the log.' }, 200);
  } catch (error) {
    console.error(`Creating counter comments failed: ${String(error)}`);
    return c.json<UiResponse>({ showToast: 'Creating the counter comments failed. See the log.' }, 200);
  }
});
