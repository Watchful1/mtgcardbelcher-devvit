import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type {
  OnAppInstallRequest,
  OnCommentCreateRequest,
  OnPostCreateRequest,
  TriggerResponse,
} from '@devvit/web/shared';

import { SOURCE_SUBREDDIT } from '../server/curation';
import { poolTick } from '../server/pool-tick';
import { respondPorts } from '../server/platform';
import { respond, type CallTarget } from '../server/respond';

export const triggers = new Hono();

// Trigger handlers never report failure to the platform: a failed reply is
// logged and dropped, like the PRAW bot did.
const ok = { status: 'success' } as const;

/** Trigger timestamps arrive in seconds or milliseconds; both become milliseconds. */
function toMs(timestamp: number): number {
  return timestamp > 1e12 ? timestamp : timestamp * 1000;
}

function withPrefix(id: string, prefix: 't1_' | 't3_'): string {
  return id.startsWith(prefix) ? id : `${prefix}${id}`;
}

/** r/MTGCardBelcher is where images are submitted, not where calls are answered. */
function answersCalls(): boolean {
  return context.subredditName.toLowerCase() !== SOURCE_SUBREDDIT.toLowerCase();
}

async function answer(target: CallTarget | undefined): Promise<void> {
  if (!target || !answersCalls()) return;
  try {
    await respond(target, await respondPorts());
  } catch (error) {
    console.error(`Replying to ${target.id} failed: ${String(error)}`);
  }
}

triggers.post('/on-comment-create', async (c) => {
  const input = await c.req.json<OnCommentCreateRequest>();
  const { comment, author, post } = input;
  await answer(
    comment && {
      id: withPrefix(comment.id, 't1_'),
      kind: 'comment',
      body: comment.body,
      authorName: author?.name ?? '',
      createdAtMs: toMs(comment.createdAt),
      postTitle: post?.title ?? '',
    },
  );
  return c.json<TriggerResponse>(ok, 200);
});

triggers.post('/on-post-create', async (c) => {
  const input = await c.req.json<OnPostCreateRequest>();
  const { post, author } = input;
  await answer(
    post && {
      id: withPrefix(post.id, 't3_'),
      kind: 'post',
      body: post.selftext,
      authorName: author?.name ?? '',
      createdAtMs: toMs(post.createdAt),
      postTitle: post.title,
    },
  );
  return c.json<TriggerResponse>(ok, 200);
});

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('App installed to subreddit: r/' + input.subreddit?.name);
  // Start curating, or seeding the image pool, straight away.
  await poolTick();
  return c.json<TriggerResponse>(ok, 200);
});
