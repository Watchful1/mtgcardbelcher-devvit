import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';

import { poolTick } from '../server/pool-tick';

export const scheduler = new Hono();

// Both the 30-minute cron and the one-off seeding continuation land here.
scheduler.post('/pool-tick', async (c) => {
  await poolTick();
  return c.json<TaskResponse>({}, 200);
});
