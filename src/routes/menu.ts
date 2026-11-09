import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';

import { COLLECTIBLES } from '../server/data/collectibles';
import { createCounterComments } from '../server/devvit/counters';
import { rebuildPool } from '../server/devvit/image-pool';

export const menu = new Hono();

// On r/MTGCardBelcher: rebuilds the pool from the newest 1,000 posts.
// Elsewhere: reloads the pool from r/MTGCardBelcher's wiki page.
menu.post('/rebuild-pool', async (c) => {
  return c.json<UiResponse>({ showToast: await rebuildPool() }, 200);
});

// Posts one counter comment per collectible under the chosen post, as the app
// account, so the app can edit them. Their ids go in the log, to be set with
// `npx devvit settings set <collectible>CounterCommentId`.
menu.post('/create-counters', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  try {
    await createCounterComments(request.targetId);
    return c.json<UiResponse>(
      { showToast: `Created ${COLLECTIBLES.length} collector counter comments. Their ids are in the log.` },
      200,
    );
  } catch (error) {
    console.error(`Creating counter comments failed: ${String(error)}`);
    return c.json<UiResponse>({ showToast: 'Creating the counter comments failed. See the log.' }, 200);
  }
});
