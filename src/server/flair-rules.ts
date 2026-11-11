// r/MTGCardBelcher's image submissions move through a flair lifecycle:
// new → pending (once a moderator approves the post) → approved (once it scores
// well) or rejected (if it doesn't within two weeks).

export const SOURCE_SUBREDDIT = 'MTGCardBelcher';

/** The flair template ids for each step of the lifecycle. */
export interface Flairs {
  new: string;
  pending: string;
  approved: string;
  rejected: string;
  other: string;
}

// Flair template ids on r/MTGCardBelcher. Recreating a template there gives it
// a new id, and these must then be updated.
export const FLAIRS: Flairs = {
  new: 'fcc29ab2-9cec-11ef-adbd-76354d1eb977',
  pending: '337aaa10-9cf5-11ef-b08d-1e57adeb694e',
  approved: '882ae2ac-2e80-11ef-bf2d-f2bf21373915',
  rejected: '50a490ba-9cf5-11ef-834b-f6ac6a413fab',
  other: '997724da-2e80-11ef-996d-26eb2b2aa996',
};

export function sameSubreddit(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** The flair's step name, for log lines, or the raw id if it isn't one of the five. */
export function flairName(flairId: string | undefined): string {
  if (flairId === undefined) return 'no flair';
  return Object.entries(FLAIRS).find(([, id]) => id === flairId)?.[0] ?? flairId;
}

// The PRAW bot also required an upvote ratio of 0.85; Devvit doesn't expose it.
export const SCORE_THRESHOLD = 50;
export const PENDING_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// Curation only changes pending and new posts, and a pending post is rejected
// after PENDING_MAX_AGE_MS, so a day beyond that covers every change it will
// make. Older posts are left as they are.
export const CURATION_WINDOW_MS = PENDING_MAX_AGE_MS + 24 * 60 * 60 * 1000;

export interface SourcePost {
  id: string;
  /** Link flair template id; undefined if the post has none. */
  flairId: string | undefined;
  /** Whether a moderator has approved the post. */
  approved: boolean;
  /** Whether a moderator has removed the post. */
  removed: boolean;
  createdAtMs: number;
  score: number;
  url: string;
}

/** The flair a post should move to, or undefined to leave it. */
export function nextFlair(post: SourcePost, nowMs: number): string | undefined {
  // As in the PRAW bot, a post with no flair template is flaired "other".
  if (post.flairId === undefined) return FLAIRS.other;

  let flair = post.flairId;
  if (flair === FLAIRS.new && post.approved) flair = FLAIRS.pending;
  if (flair === FLAIRS.pending && post.score >= SCORE_THRESHOLD) flair = FLAIRS.approved;
  if (flair === FLAIRS.pending && nowMs - post.createdAtMs > PENDING_MAX_AGE_MS) flair = FLAIRS.rejected;
  return flair === post.flairId ? undefined : flair;
}
