// The source subreddit's image submissions move through a flair lifecycle:
// new → pending (once a moderator approves the post) → approved (once it scores
// well) or rejected (if it doesn't within two weeks).

/** The flair template ids for each step of the lifecycle. */
export interface Flairs {
  new: string;
  pending: string;
  approved: string;
  rejected: string;
  other: string;
}

/** The subreddit whose submissions make the image pool, and its flairs. */
export interface Source {
  subredditName: string;
  flairs: Flairs;
}

export const DEFAULT_SOURCE_SUBREDDIT = 'MTGCardBelcher';

// Flair template ids on r/MTGCardBelcher. Recreating a template there gives it
// a new id, and these must then be updated.
export const MTGCARDBELCHER_FLAIRS: Flairs = {
  new: 'fcc29ab2-9cec-11ef-adbd-76354d1eb977',
  pending: '337aaa10-9cf5-11ef-b08d-1e57adeb694e',
  approved: '882ae2ac-2e80-11ef-bf2d-f2bf21373915',
  rejected: '50a490ba-9cf5-11ef-834b-f6ac6a413fab',
  other: '997724da-2e80-11ef-996d-26eb2b2aa996',
};

export const DEFAULT_SOURCE: Source = { subredditName: DEFAULT_SOURCE_SUBREDDIT, flairs: MTGCARDBELCHER_FLAIRS };

export function sameSubreddit(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * For a test source subreddit: its flairs, found by template text (New,
 * Pending, Approved, Rejected, Other, in any case). Throws, naming the missing
 * ones, if any of the five isn't there.
 */
export function flairsFromTemplates(templates: { id: string; text: string }[]): Flairs {
  const steps = ['new', 'pending', 'approved', 'rejected', 'other'] as const;
  const found: Partial<Flairs> = {};
  for (const step of steps) {
    const template = templates.find((t) => t.text.trim().toLowerCase() === step);
    if (template) found[step] = template.id;
  }
  const missing = steps.filter((step) => !found[step]);
  if (missing.length > 0) throw new Error(`the source subreddit has no post flair named ${missing.join(', ')}`);
  return found as Flairs;
}

/** The flair's step name, for log lines, or the raw id if it isn't one of the five. */
export function flairName(flairId: string | undefined, flairs: Flairs): string {
  if (flairId === undefined) return 'no flair';
  return Object.entries(flairs).find(([, id]) => id === flairId)?.[0] ?? flairId;
}

// The PRAW bot also required an upvote ratio of 0.85; Devvit doesn't expose it.
export const SCORE_THRESHOLD = 50;
export const PENDING_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// Curation only changes pending and new posts, and a pending post is rejected
// after PENDING_MAX_AGE_MS, so scanning a day beyond that sees every change it
// will make. Older posts are left as they are.
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
export function nextFlair(post: SourcePost, nowMs: number, flairs: Flairs): string | undefined {
  // As in the PRAW bot, a post with no flair template is flaired "other".
  if (post.flairId === undefined) return flairs.other;

  let flair = post.flairId;
  if (flair === flairs.new && post.approved) flair = flairs.pending;
  if (flair === flairs.pending && post.score >= SCORE_THRESHOLD) flair = flairs.approved;
  if (flair === flairs.pending && nowMs - post.createdAtMs > PENDING_MAX_AGE_MS) flair = flairs.rejected;
  return flair === post.flairId ? undefined : flair;
}
