// The r/MTGCardBelcher install's scheduled work: seeding the image pool once,
// curating flairs, and writing the pool to the wiki page the other installs read.

import { CURATION_WINDOW_MS, flairName, nextFlair, type SourcePost } from './flair-rules';
import { formatPoolPage, parsePoolPage, poolChanges, type PoolPost } from './image-pool';
import type { Store } from './store';

export const PAGE_SIZE = 100;
// The PRAW bot read the newest 1,000 posts; seeding reads the same.
export const SEED_MAX_PAGES = 10;
// r/MTGCardBelcher gets a handful of posts a month, so the curation window is
// almost always on the first page; the cap only guards against a runaway loop.
const CURATION_MAX_PAGES = 10;

export interface Page {
  posts: SourcePost[];
  /** Cursor for the next (older) page, or undefined if this was the last. */
  after: string | undefined;
}

export interface SourcePorts {
  store: Store;
  fetchPage: (after: string | undefined) => Promise<Page>;
  setFlair: (postId: string, flairId: string) => Promise<void>;
  /** The pool's wiki page as it is now, or undefined if it doesn't exist or can't be read. */
  readWikiPage: () => Promise<string | undefined>;
  writeWikiPage: (content: string) => Promise<void>;
  now: () => number;
  /** False once the run should stop starting new work, to stay inside the 30-second limit. */
  timeLeft: () => boolean;
  /** Log flair changes instead of making them. */
  dryRun: boolean;
}

/** 'seeding' means seeding ran out of time and another run should follow straight away. */
export type SourceRunResult = 'seeding' | 'done';

export async function runSource(ports: SourcePorts): Promise<SourceRunResult> {
  const { store } = ports;
  if (await store.takeResetRequest()) {
    await store.resetSource();
    console.log('Image pool reset for a rebuild');
  }
  if (!(await store.sourceSeeded())) {
    if (!(await seed(ports))) return 'seeding';
  } else {
    await curate(ports);
  }
  await publish(ports);
  return 'done';
}

/** Adds every pool image from the newest 1,000 posts, a page at a time. True once finished. */
async function seed(ports: SourcePorts): Promise<boolean> {
  const { store } = ports;
  const progress = await store.seedProgress();
  let after = progress?.after;
  let pages = progress?.pages ?? 0;
  while (ports.timeLeft()) {
    const page = await ports.fetchPage(after);
    // The pool starts empty, so seeding only adds.
    await store.applySourceChanges({ ...poolChanges(page.posts), remove: [] });
    pages++;
    if (!page.after || pages >= SEED_MAX_PAGES) {
      await store.finishSeeding();
      console.log(`Image pool seeded from ${pages} pages`);
      return true;
    }
    after = page.after;
    await store.setSeedProgress({ after, pages });
  }
  return false;
}

/** Posts from the last CURATION_WINDOW_MS, newest first. */
async function recentPosts(ports: SourcePorts): Promise<SourcePost[]> {
  const cutoff = ports.now() - CURATION_WINDOW_MS;
  const posts: SourcePost[] = [];
  let after: string | undefined;
  for (let page = 0; page < CURATION_MAX_PAGES && ports.timeLeft(); page++) {
    const result = await ports.fetchPage(after);
    const recent = result.posts.filter((post) => post.createdAtMs >= cutoff);
    posts.push(...recent);
    if (recent.length < result.posts.length || !result.after) break;
    after = result.after;
  }
  return posts;
}

/**
 * Moves recent posts through the flair lifecycle, then brings the pool in
 * line with their flairs and removals, in case a trigger was missed. A
 * moderator's change that lands between the listing and this update is
 * undone here, and redone by the next run.
 */
async function curate(ports: SourcePorts): Promise<void> {
  const settled: SourcePost[] = [];
  let changes = 0;
  for (const post of await recentPosts(ports)) {
    if (!ports.timeLeft()) {
      console.log('Curation stopped to stay inside the time limit; the next run continues');
      break;
    }
    const flair = nextFlair(post, ports.now());
    if (flair && ports.dryRun) {
      console.log(`Dry run: would set flair of ${post.id} from ${flairName(post.flairId)} to ${flairName(flair)}`);
    } else if (flair) {
      await ports.setFlair(post.id, flair);
      console.log(`Set flair of ${post.id} from ${flairName(post.flairId)} to ${flairName(flair)}`);
    }
    if (flair) changes++;
    settled.push(flair && !ports.dryRun ? { ...post, flairId: flair } : post);
  }
  if (changes > 0) console.log(`Curation ${ports.dryRun ? 'would change' : 'changed'} ${changes} flairs`);
  await ports.store.applySourceChanges(poolChanges(settled));
}

/**
 * Writes the pool to the wiki page if the page differs from it, which also
 * repairs a page someone edited. Skipped until the pool is fully seeded, so the
 * other installs never load a partial pool.
 */
async function publish(ports: SourcePorts): Promise<void> {
  if (!(await ports.store.sourceSeeded())) return;
  const content = formatPoolPage(await ports.store.sourcePool());
  const live = await ports.readWikiPage();
  // Compare the images, not the text: readers only see the images, and Reddit
  // may hand the text back with different line endings.
  if (live !== undefined && parsePoolPage(live).join() === parsePoolPage(content).join()) return;
  await ports.writeWikiPage(content);
  console.log(`Image pool page written: ${parsePoolPage(content).length} images`);
}

/** Updates the pool for one post whose flair changed, or that a moderator removed or restored. */
export async function onPostChanged(post: PoolPost, ports: SourcePorts): Promise<void> {
  await ports.store.applySourceChanges(poolChanges([post]));
  await publish(ports);
}

/** Drops a deleted post from the pool. */
export async function onPostDeleted(postId: string, ports: SourcePorts): Promise<void> {
  await ports.store.applySourceChanges({ add: new Map(), remove: [postId] });
  await publish(ports);
}

/**
 * Loads the pool from the wiki page into this install's cache. Keeps the
 * cached pool if the page can't be read or holds no images. Returns the number
 * of images loaded, or undefined if it kept the cache.
 */
export async function refreshPool(store: Store, readWikiPage: () => Promise<string | undefined>): Promise<number | undefined> {
  const content = await readWikiPage();
  const urls = content === undefined ? [] : parsePoolPage(content);
  if (urls.length === 0) {
    console.error(`Image pool page ${content === undefined ? "couldn't be read" : 'has no images'}; keeping the cached pool`);
    return undefined;
  }
  await store.setPool(urls);
  console.log(`Image pool loaded: ${urls.length} images`);
  return urls.length;
}
