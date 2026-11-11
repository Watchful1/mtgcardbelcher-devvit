import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type {
  OnAppInstallRequest,
  OnCommentCreateRequest,
  OnPostCreateRequest,
  TriggerResponse,
} from '@devvit/web/shared';

import { asCommentId, asPostId } from '../server/ids';
import { poolTick } from '../server/devvit/image-pool';
import { sameSubreddit, SOURCE_SUBREDDIT } from '../server/flair-rules';
import { respondPorts } from '../server/devvit/replies';
import { respond, type CallTarget } from '../server/respond';

export const triggers = new Hono();

// Trigger handlers never report failure to the platform: a failure is logged and dropped.
const ok: TriggerResponse = {};

/** Trigger timestamps arrive in seconds or milliseconds; both become milliseconds. */
function toMs(timestamp: number): number {
  return timestamp > 1e12 ? timestamp : timestamp * 1000;
}

async function answer(target: CallTarget | undefined): Promise<void> {
  if (!target) return;
  // r/MTGCardBelcher is where images are submitted, not where calls are answered.
  if (sameSubreddit(context.subredditName, SOURCE_SUBREDDIT)) return;
  try {
    await respond(target, await respondPorts());
  } catch (error) {
    console.error(`Replying to ${target.id} failed: ${String(error)}`);
  }
}

triggers.post('/on-comment-create', async (c) => {
  const { comment, author, post } = await c.req.json<OnCommentCreateRequest>();
  await answer(
    comment && {
      id: asCommentId(comment.id),
      kind: 'comment',
      body: comment.body,
      authorName: author?.name ?? '',
      createdAtMs: toMs(comment.createdAt),
      postTitle: post?.title ?? '',
    },
  );
  return c.json(ok, 200);
});

triggers.post('/on-post-create', async (c) => {
  const { post, author } = await c.req.json<OnPostCreateRequest>();
  await answer(
    post && {
      id: asPostId(post.id),
      kind: 'post',
      body: post.selftext,
      authorName: author?.name ?? '',
      createdAtMs: toMs(post.createdAt),
      postTitle: post.title,
    },
  );
  return c.json(ok, 200);
});

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('App installed to subreddit: r/' + input.subreddit?.name);
  // Fill the image pool straight away, rather than at the next scheduled scan.
  await poolTick();
  return c.json(ok, 200);
});
