import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type {
  OnAppInstallRequest,
  OnCommentCreateRequest,
  OnModActionRequest,
  OnPostCreateRequest,
  OnPostDeleteRequest,
  OnPostFlairUpdateRequest,
  TriggerResponse,
} from '@devvit/web/shared';

import { isSourceSubreddit } from '../server/flair-rules';
import { asCommentId, asPostId } from '../server/ids';
import { poolTick, postChanged, postDeleted } from '../server/devvit/image-pool';
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
  // r/MTGCardBelcher is where images are submitted, not where calls are answered.
  if (!target || isSourceSubreddit(context.subredditName)) return;
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

// The next three only act on r/MTGCardBelcher, where they keep the image pool current.
triggers.post('/on-post-flair-update', async (c) => {
  const { post } = await c.req.json<OnPostFlairUpdateRequest>();
  if (post) {
    try {
      await postChanged({ id: post.id, flairId: post.linkFlair?.templateId || undefined, url: post.url });
    } catch (error) {
      console.error(`Updating the image pool for ${post.id} failed: ${String(error)}`);
    }
  }
  return c.json(ok, 200);
});

triggers.post('/on-post-delete', async (c) => {
  const { postId } = await c.req.json<OnPostDeleteRequest>();
  try {
    await postDeleted(postId);
  } catch (error) {
    console.error(`Removing ${postId} from the image pool failed: ${String(error)}`);
  }
  return c.json(ok, 200);
});

// A moderator removing a post takes it out of the pool; approving it again puts it back.
const REMOVALS = ['removelink', 'spamlink'];
triggers.post('/on-mod-action', async (c) => {
  const { action, targetPost: post } = await c.req.json<OnModActionRequest>();
  if (post && action && (REMOVALS.includes(action) || action === 'approvelink')) {
    try {
      await postChanged({
        id: post.id,
        flairId: post.linkFlair?.templateId || undefined,
        url: post.url,
        removed: REMOVALS.includes(action),
      });
    } catch (error) {
      console.error(`Updating the image pool for ${post.id} after ${action} failed: ${String(error)}`);
    }
  }
  return c.json(ok, 200);
});

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('App installed to subreddit: r/' + input.subreddit?.name);
  // Start curating, or loading the image pool, straight away.
  await poolTick();
  return c.json(ok, 200);
});
