import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';

import { poolTick } from '../server/devvit/image-pool';

export const scheduler = new Hono();

// Every 30 minutes: rebuild the image pool, curating flairs on r/MTGCardBelcher.
scheduler.post('/pool-tick', async (c) => {
  await poolTick();
  return c.json<TaskResponse>({}, 200);
});
