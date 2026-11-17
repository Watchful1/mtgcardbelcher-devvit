import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';

import { rebuildPool } from '../server/devvit/image-pool';

export const menu = new Hono();

// Rebuilds the image pool now, instead of at the next scheduled scan.
menu.post('/rebuild-pool', async (c) => {
  return c.json<UiResponse>({ showToast: await rebuildPool() }, 200);
});
