import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';

import { store } from '../server/platform';
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
