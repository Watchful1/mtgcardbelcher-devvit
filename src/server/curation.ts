// r/MTGCardBelcher's image submissions: moving posts through the flair
// lifecycle, and deciding which ones belong in the joke image pool.

export const SOURCE_SUBREDDIT = 'MTGCardBelcher';

export const FLAIRS = {
  new: 'fcc29ab2-9cec-11ef-adbd-76354d1eb977',
  pending: '337aaa10-9cf5-11ef-b08d-1e57adeb694e',
  approved: '882ae2ac-2e80-11ef-bf2d-f2bf21373915',
  rejected: '50a490ba-9cf5-11ef-834b-f6ac6a413fab',
  other: '997724da-2e80-11ef-996d-26eb2b2aa996',
} as const;

export const SCORE_THRESHOLD = 50;
export const RATIO_THRESHOLD = 0.85;
export const PENDING_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// A post's flair only changes while it is pending, which ends after
// PENDING_MAX_AGE_MS, so scanning a day beyond that sees every change.
export const SCAN_WINDOW_MS = PENDING_MAX_AGE_MS + 24 * 60 * 60 * 1000;

// Always in the pool, in memory of u/MTGLardFetcher.
export const JOLLYVER = 'https://i.redd.it/pcmd6d3o1oad1.png';

export interface SourcePost {
  id: string;
  /** Link flair template ID; undefined if the post has no flair. */
  flairId: string | undefined;
  /** Whether a moderator has approved the post. */
  approved: boolean;
  createdAtMs: number;
  score: number;
  /** Undefined where the platform doesn't expose it. */
  upvoteRatio: number | undefined;
  url: string;
}

/** The flair a post should move to, or undefined to leave it. */
export function nextFlair(post: SourcePost, nowMs: number): string | undefined {
  if (post.flairId === undefined) return FLAIRS.other;

  let flair = post.flairId;
  if (flair === FLAIRS.new && post.approved) flair = FLAIRS.pending;
  if (flair === FLAIRS.pending && popular(post)) flair = FLAIRS.approved;
  if (flair === FLAIRS.pending && nowMs - post.createdAtMs > PENDING_MAX_AGE_MS) flair = FLAIRS.rejected;
  return flair === post.flairId ? undefined : flair;
}

function popular(post: SourcePost): boolean {
  if (post.score < SCORE_THRESHOLD) return false;
  // Without a ratio, the score alone decides.
  return post.upvoteRatio === undefined || post.upvoteRatio >= RATIO_THRESHOLD;
}

/** Approved posts linking straight to an image on Reddit or Imgur. Self-posts link to the subreddit. */
export function isPoolImage(post: Pick<SourcePost, 'flairId' | 'url'>): boolean {
  return (
    post.flairId === FLAIRS.approved &&
    !post.url.includes(SOURCE_SUBREDDIT) &&
    /(i\.redd\.it|i\.imgur\.com)/.test(post.url)
  );
}

export interface PoolChanges {
  /** Post ID → image URL. */
  add: Map<string, string>;
  remove: string[];
}

/** Pool changes from a scan of recent posts: add the pool images, remove the rest. */
export function poolChanges(posts: Pick<SourcePost, 'id' | 'flairId' | 'url'>[]): PoolChanges {
  const changes: PoolChanges = { add: new Map(), remove: [] };
  for (const post of posts) {
    if (isPoolImage(post)) changes.add.set(post.id, post.url);
    else changes.remove.push(post.id);
  }
  return changes;
}
