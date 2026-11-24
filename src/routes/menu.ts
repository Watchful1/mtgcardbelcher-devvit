import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';

import { rebuildPool } from '../server/devvit/run-pool-scan';
import { SOURCE_SUBREDDIT } from '../server/flair-rules';

export const menu = new Hono();

// Rebuilds the image pool now, instead of at the next scheduled scan.
menu.post('/rebuild-pool', async (c) => {
  const images = await rebuildPool();
  const showToast =
    images === undefined
      ? 'Rebuilding the image pool failed; the old pool is kept. See the log.'
      : `The image pool has ${images} images from r/${SOURCE_SUBREDDIT}.`;
  return c.json<UiResponse>({ showToast }, 200);
});
