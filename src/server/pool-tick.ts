// The scheduled run: curation on r/MTGCardBelcher, the image pool everywhere else.

import { context, reddit, scheduler } from '@devvit/web/server';

import { SOURCE_SUBREDDIT } from './curation';
import { store } from './platform';
import { curate, PAGE_SIZE, syncPool, type Page, type SyncPorts, type SyncResult } from './pool-sync';
import { CONTINUE_TASK } from './pool-tick-task';

// Leaves room under the 30-second handler limit for the page in flight.
const RUN_BUDGET_MS = 20_000;

async function fetchPage(after: string | undefined): Promise<Page> {
  const posts = await reddit
    .getNewPosts({ subredditName: SOURCE_SUBREDDIT, limit: PAGE_SIZE, pageSize: PAGE_SIZE, ...(after ? { after } : {}) })
    .all();
  return {
    posts: posts.map((post) => ({
      id: post.id,
      flairId: post.flair?.templateId || undefined,
      approved: post.approved,
      createdAtMs: post.createdAt.getTime(),
      score: post.score,
      // Devvit's Post doesn't expose the upvote ratio, so approval goes by score alone.
      upvoteRatio: undefined,
      url: post.url,
    })),
    after: posts.length === PAGE_SIZE ? posts.at(-1)?.id : undefined,
  };
}

async function setFlair(postId: string, flairId: string): Promise<void> {
  await reddit.setPostFlair({ subredditName: SOURCE_SUBREDDIT, postId: postId as `t3_${string}`, flairTemplateId: flairId });
}

export async function poolTick(): Promise<void> {
  const db = store();
  const release = await db.lockPoolTick();
  if (!release) {
    console.log('Pool tick skipped: another run holds the lock');
    return;
  }
  let result: SyncResult | undefined;
  try {
    const ports: SyncPorts = { store: db, fetchPage, setFlair, now: Date.now, deadline: Date.now() + RUN_BUDGET_MS };
    if (context.subredditName.toLowerCase() === SOURCE_SUBREDDIT.toLowerCase()) {
      console.log(`Curation changed ${await curate(ports)} flairs`);
    } else {
      if (await db.takeResetRequest()) {
        await db.resetPool();
        console.log('Image pool reset for a rebuild');
      }
      result = await syncPool(ports);
    }
  } catch (error) {
    console.error(`Pool tick failed: ${String(error)}`);
  } finally {
    await release();
  }
  // Scheduled only after the lock is released, so the continuation can't find it still held.
  if (result === 'seeding') await scheduler.runJob({ name: CONTINUE_TASK, runAt: new Date() });
}
