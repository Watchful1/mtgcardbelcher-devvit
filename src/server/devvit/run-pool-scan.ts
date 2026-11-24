// The image pool scan, wired to Devvit. Every install scans r/MTGCardBelcher;
// the install there also curates flairs, if the app is a moderator.

import { context, reddit, settings } from '@devvit/web/server';

import { CURATION_DRY_RUN_SETTING, isDryRun } from '../config';
import { sameSubreddit, SOURCE_SUBREDDIT, type SourcePost } from '../flair-rules';
import { asPostId } from '../ids';
import { PAGE_SIZE, scanPool, type Curation, type Page } from '../image-pool';
import { appUsername, store } from './platform';

// Leaves room under the 30-second handler limit for the request in flight.
const RUN_BUDGET_MS = 20_000;

async function fetchPage(after: string | undefined): Promise<Page> {
  const posts = await reddit
    .getNewPosts({
      subredditName: SOURCE_SUBREDDIT,
      limit: PAGE_SIZE,
      pageSize: PAGE_SIZE,
      ...(after ? { after } : {}),
    })
    .all();
  return {
    posts: posts.map((post): SourcePost => ({
      id: post.id,
      flairId: post.flair?.templateId || undefined,
      approved: post.approved,
      removed: post.removed || post.spam,
      createdAtMs: post.createdAt.getTime(),
      score: post.score,
      url: post.url,
    })),
    after: posts.length === PAGE_SIZE ? posts.at(-1)?.id : undefined,
  };
}

/** Mod actions fail silently without mod rights, so check before relying on them. */
async function isModerator(): Promise<boolean> {
  const username = await appUsername();
  const found = await reddit.getModerators({ subredditName: SOURCE_SUBREDDIT, username }).all();
  return found.length > 0;
}

async function curation(): Promise<Curation | undefined> {
  if (!sameSubreddit(context.subredditName, SOURCE_SUBREDDIT)) return undefined;
  if (!(await isModerator())) {
    console.error(`The app is not a moderator of r/${SOURCE_SUBREDDIT}, so it can't curate flairs`);
    return undefined;
  }
  return {
    setFlair: async (postId, flairId) => {
      await reddit.setPostFlair({
        subredditName: SOURCE_SUBREDDIT,
        postId: asPostId(postId),
        flairTemplateId: flairId,
      });
    },
    dryRun: isDryRun(await settings.get(CURATION_DRY_RUN_SETTING)),
  };
}

/**
 * Rebuilds this install's pool, curating on the way on r/MTGCardBelcher. Run
 * every 30 minutes, on install and from the menu. Returns the number of
 * images, or undefined if the scan failed and the old pool was kept.
 */
export async function rebuildPool(): Promise<number | undefined> {
  const deadline = Date.now() + RUN_BUDGET_MS;
  try {
    return await scanPool({
      store: store(),
      fetchPage,
      curation: await curation(),
      now: Date.now,
      timeLeft: () => Date.now() < deadline,
    });
  } catch (error) {
    console.error(`Image pool scan failed, keeping the old pool: ${String(error)}`);
    return undefined;
  }
}
