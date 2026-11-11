// The joke image pool: approved posts on r/MTGCardBelcher that link straight
// to an image. Every install rebuilds its own pool by scanning the subreddit's
// newest posts, and the r/MTGCardBelcher install curates flairs on the way.

import { CURATION_WINDOW_MS, FLAIRS, flairName, nextFlair, type SourcePost } from './flair-rules';
import type { Store } from './store';

// Always in the pool, in memory of u/MTGLardFetcher.
export const JOLLYVER = 'https://i.redd.it/pcmd6d3o1oad1.png';

export const PAGE_SIZE = 100;
// Reddit lists at most a subreddit's newest 1,000 posts, as the PRAW bot read.
export const MAX_PAGES = 10;

/** A direct link to an image hosted on Reddit or Imgur. Self-posts link to the subreddit, so they never match. */
export function isImageUrl(url: string): boolean {
  return /^https:\/\/(i\.redd\.it|i\.imgur\.com)\//.test(url);
}

/** Approved posts, not removed by a moderator, linking straight to an image. */
export function isPoolImage(post: Pick<SourcePost, 'flairId' | 'removed' | 'url'>): boolean {
  return post.flairId === FLAIRS.approved && !post.removed && isImageUrl(post.url);
}

export interface Page {
  posts: SourcePost[];
  /** Cursor for the next (older) page, or undefined if this was the last. */
  after: string | undefined;
}

export interface Curation {
  setFlair: (postId: string, flairId: string) => Promise<void>;
  /** Log flair changes instead of making them. */
  dryRun: boolean;
}

export interface ScanPorts {
  store: Store;
  fetchPage: (after: string | undefined) => Promise<Page>;
  /** Set only on the r/MTGCardBelcher install, and only when the app is a moderator there. */
  curation: Curation | undefined;
  now: () => number;
  /** False once the scan should stop, to stay inside the 30-second handler limit. */
  timeLeft: () => boolean;
}

/**
 * Reads r/MTGCardBelcher's newest posts and replaces the pool with the images
 * among them. Returns the number of images, or undefined if the scan ran out
 * of time, in which case the old pool is kept.
 */
export async function scanPool(ports: ScanPorts): Promise<number | undefined> {
  const urls: string[] = [];
  let after: string | undefined;
  let pages = 0;
  do {
    if (!ports.timeLeft()) {
      console.error(`Image pool scan ran out of time after ${pages} pages; keeping the old pool`);
      return undefined;
    }
    const page = await ports.fetchPage(after);
    pages++;
    for (const fetched of page.posts) {
      const post = await curate(fetched, ports);
      if (isPoolImage(post)) urls.push(post.url);
    }
    after = page.after;
  } while (after && pages < MAX_PAGES);

  await ports.store.setPool(urls);
  console.log(`Image pool rebuilt: ${urls.length} images from ${pages} pages`);
  return urls.length;
}

/** Moves a recent post along the flair lifecycle, if this install curates. Returns the post as it now stands. */
async function curate(post: SourcePost, ports: ScanPorts): Promise<SourcePost> {
  const { curation } = ports;
  if (!curation || ports.now() - post.createdAtMs > CURATION_WINDOW_MS) return post;
  const flair = nextFlair(post, ports.now());
  if (!flair) return post;
  const change = `flair of ${post.id} from ${flairName(post.flairId)} to ${flairName(flair)}`;
  if (curation.dryRun) {
    console.log(`Dry run: would set ${change}`);
    return post;
  }
  try {
    await curation.setFlair(post.id, flair);
  } catch (error) {
    // The next scan tries again.
    console.error(`Setting ${change} failed: ${String(error)}`);
    return post;
  }
  console.log(`Set ${change}`);
  return { ...post, flairId: flair };
}
