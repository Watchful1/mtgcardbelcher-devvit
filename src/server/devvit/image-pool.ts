// The image pool and curation, wired to Devvit. On the source subreddit
// (r/MTGCardBelcher) the app curates flairs and keeps the pool on a wiki page;
// everywhere else it reads that page.

import { context, reddit, scheduler, settings } from '@devvit/web/server';
import type { WikiPagePermissionLevel } from '@devvit/web/server';

import { CONTINUE_TASK, CURATION_DRY_RUN_SETTING } from '../config';
import { sameSubreddit, type Source, type SourcePost } from '../flair-rules';
import { asPostId } from '../ids';
import { POOL_WIKI_PAGE, type PoolPost } from '../image-pool';
import {
  onPostChanged,
  onPostDeleted,
  PAGE_SIZE,
  refreshPool,
  runSource,
  type Page,
  type SourcePorts,
} from '../source-sync';
import type { Store } from '../store';
import { appUsername, store } from './platform';
import { isOnSource, sourceConfig, sourceSubredditName } from './source';

// Leaves room under the 30-second handler limit for the request in flight.
const RUN_BUDGET_MS = 20_000;

// Only moderators and approved wiki contributors may edit the page; who can
// read it follows the subreddit's wiki settings.
const APPROVED_CONTRIBUTORS_ONLY = 1 as WikiPagePermissionLevel;

async function fetchPage(subredditName: string, after: string | undefined): Promise<Page> {
  const posts = await reddit
    .getNewPosts({ subredditName, limit: PAGE_SIZE, pageSize: PAGE_SIZE, ...(after ? { after } : {}) })
    .all();
  return {
    posts: posts.map(
      (post): SourcePost => ({
        id: post.id,
        flairId: post.flair?.templateId || undefined,
        approved: post.approved,
        removed: post.removed,
        createdAtMs: post.createdAt.getTime(),
        score: post.score,
        url: post.url,
      }),
    ),
    after: posts.length === PAGE_SIZE ? posts.at(-1)?.id : undefined,
  };
}

/** Writing a page that doesn't exist creates it. Its permissions are set once, after the first write. */
async function writeWikiPage(db: Store, subredditName: string, content: string): Promise<void> {
  await reddit.updateWikiPage({ subredditName, page: POOL_WIKI_PAGE, content, reason: 'Image pool update' });
  if (await db.pageSettingsApplied()) return;
  await reddit.updateWikiPageSettings({
    subredditName,
    page: POOL_WIKI_PAGE,
    listed: false,
    permLevel: APPROVED_CONTRIBUTORS_ONLY,
  });
  await db.setPageSettingsApplied();
}

/** The page's text, or undefined if it can't be read. Logs the failure unless the caller expects it. */
async function readWikiPage(subredditName: string, options: { quiet?: boolean } = {}): Promise<string | undefined> {
  try {
    return (await reddit.getWikiPage(subredditName, POOL_WIKI_PAGE)).content;
  } catch (error) {
    if (!options.quiet) console.error(`Reading r/${subredditName}/wiki/${POOL_WIKI_PAGE} failed: ${String(error)}`);
    return undefined;
  }
}

async function sourcePorts(source: Source): Promise<SourcePorts> {
  const db = store();
  const name = source.subredditName;
  const deadline = Date.now() + RUN_BUDGET_MS;
  // Unset counts as on, so curation can't change flairs until someone turns it off.
  const dryRun = (await settings.get<boolean>(CURATION_DRY_RUN_SETTING)) ?? true;
  return {
    store: db,
    source,
    fetchPage: (after) => fetchPage(name, after),
    setFlair: async (postId, flairId) => {
      await reddit.setPostFlair({ subredditName: name, postId: asPostId(postId), flairTemplateId: flairId });
    },
    // Before the first write the page doesn't exist, so a failed read isn't news here.
    readWikiPage: () => readWikiPage(name, { quiet: true }),
    writeWikiPage: (content) => writeWikiPage(db, name, content),
    now: Date.now,
    timeLeft: () => Date.now() < deadline,
    dryRun,
  };
}

/** Mod actions fail silently without mod rights, so check before relying on them. */
async function isModeratorOf(subredditName: string): Promise<boolean> {
  const username = await appUsername();
  const found = await reddit.getModerators({ subredditName, username }).all();
  return found.length > 0;
}

/** Curates and publishes the pool on the source subreddit. True if seeding needs another run. */
async function runOnSource(): Promise<boolean> {
  const source = await sourceConfig();
  if (!(await isModeratorOf(source.subredditName))) {
    console.error(`The app is not a moderator of r/${source.subredditName}, so it can't curate or write the image pool`);
    return false;
  }
  return (await runSource(await sourcePorts(source))) === 'seeding';
}

/**
 * The scheduled run, also used on install and from the rebuild menu item.
 * Returns false if another run held the lock, so this one did nothing.
 */
export async function poolTick(): Promise<boolean> {
  const db = store();
  const release = await db.lockPoolTick();
  if (!release) {
    console.log('Pool run skipped: another run holds the lock');
    return false;
  }
  let needsContinue = false;
  try {
    const sourceName = await sourceSubredditName();
    if (sameSubreddit(context.subredditName, sourceName)) {
      needsContinue = await runOnSource();
    } else {
      await refreshPool(db, () => readWikiPage(sourceName));
    }
  } catch (error) {
    console.error(`Pool run failed: ${String(error)}`);
  } finally {
    await release();
  }
  // Scheduled only after the lock is released, so the continuation can't find it still held.
  if (needsContinue) await scheduler.runJob({ name: CONTINUE_TASK, runAt: new Date() });
  return true;
}

/** A post on the source subreddit changed flair, or was removed or restored: update the pool. */
export async function postChanged(post: PoolPost): Promise<void> {
  if (!(await isOnSource(context.subredditName))) return;
  await onPostChanged({ ...post, id: asPostId(post.id) }, await sourcePorts(await sourceConfig()));
}

/** A post was deleted on the source subreddit: drop it from the pool. */
export async function postDeleted(postId: string): Promise<void> {
  if (!(await isOnSource(context.subredditName))) return;
  await onPostDeleted(asPostId(postId), await sourcePorts(await sourceConfig()));
}

/** For the rebuild menu item: reseed the pool on the source subreddit, or reload it elsewhere. Returns the toast. */
export async function rebuildPool(): Promise<string> {
  const sourceName = await sourceSubredditName();
  if (sameSubreddit(context.subredditName, sourceName)) {
    await store().requestReset();
    await poolTick();
    return 'Rebuilding the image pool from the newest 1,000 posts. It can take up to half an hour to finish.';
  }
  if (!(await poolTick())) return 'Another image pool update is running. Try again in a minute.';
  const images = (await store().pool()).length - 1;
  return `The image pool has ${images} images from r/${sourceName}. The log says if the reload failed.`;
}
