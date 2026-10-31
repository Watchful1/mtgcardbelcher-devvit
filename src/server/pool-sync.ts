// Reading r/MTGCardBelcher: curating flairs on its own install, and keeping
// the image pool up to date on every other install.

import { nextFlair, poolChanges, SCAN_WINDOW_MS, type SourcePost } from './curation';
import type { Store } from './store';

export const PAGE_SIZE = 100;
// The PRAW bot read the newest 1,000 posts; seeding reads the same.
export const SEED_MAX_PAGES = 10;
// Recent posts arrive about once a month, so the window rarely needs a second page.
const WINDOW_MAX_PAGES = 10;

export interface Page {
  posts: SourcePost[];
  /** Cursor for the next (older) page, or undefined if this was the last. */
  after: string | undefined;
}

export interface SyncPorts {
  store: Store;
  fetchPage: (after: string | undefined) => Promise<Page>;
  setFlair: (postId: string, flairId: string) => Promise<void>;
  now: () => number;
  /** Time after which a run stops starting new pages, to stay inside the 30-second limit. */
  deadline: number;
}

/** Posts from the last SCAN_WINDOW_MS, newest first. */
async function recentPosts(ports: SyncPorts): Promise<SourcePost[]> {
  const cutoff = ports.now() - SCAN_WINDOW_MS;
  const posts: SourcePost[] = [];
  let after: string | undefined;
  for (let page = 0; page < WINDOW_MAX_PAGES; page++) {
    const result = await ports.fetchPage(after);
    const recent = result.posts.filter((post) => post.createdAtMs >= cutoff);
    posts.push(...recent);
    if (recent.length < result.posts.length || !result.after) break;
    after = result.after;
  }
  return posts;
}

/** Moves recent posts through the flair lifecycle. Returns how many changed. */
export async function curate(ports: SyncPorts): Promise<number> {
  let changed = 0;
  for (const post of await recentPosts(ports)) {
    const flair = nextFlair(post, ports.now());
    if (!flair) continue;
    await ports.setFlair(post.id, flair);
    console.log(`Flair of ${post.id} set to ${flair}`);
    changed++;
  }
  return changed;
}

export type SyncResult = 'updated' | 'seeded' | 'seeding';

/**
 * Seeds the pool from the newest 1,000 posts if it hasn't been yet, a page at a
 * time across runs if needed; otherwise updates it from recent posts.
 * 'seeding' means the deadline cut seeding short and another run should follow.
 */
export async function syncPool(ports: SyncPorts): Promise<SyncResult> {
  const { store } = ports;
  if (await store.seeded()) {
    await store.applyPoolChanges(poolChanges(await recentPosts(ports)));
    return 'updated';
  }

  const saved = await store.seedCursor();
  let { after, pages } = saved ? (JSON.parse(saved) as { after: string; pages: number }) : { after: undefined as string | undefined, pages: 0 };
  while (ports.now() < ports.deadline) {
    const page = await ports.fetchPage(after);
    // Seeding adds pool images and removes nothing: the pool starts empty.
    await store.applyPoolChanges({ ...poolChanges(page.posts), remove: [] });
    pages++;
    if (!page.after || pages >= SEED_MAX_PAGES) {
      await store.finishSeeding();
      console.log(`Image pool seeded from ${pages} pages`);
      return 'seeded';
    }
    after = page.after;
    await store.setSeedCursor(JSON.stringify({ after, pages }));
  }
  return 'seeding';
}
