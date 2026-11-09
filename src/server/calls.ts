// Finding [[calls]] in comments and posts, and deciding which items to skip.

// New Reddit's rich-text editor stores [[x]] as \[\[x\]\], and escapes other
// markdown characters inside too (Some\_Name); markdown mode and mobile store
// it as typed. The two forms can't overlap, so no call is found twice. A call
// never spans lines.
const ESCAPED_CALL = /\\\[\\\[((?:\\[^[\]\n]|[^\\[\]\n])+?)\\\]\\\]/g;
const PLAIN_CALL = /\[\[([^[\]\n]+)]]/g;

// The longest real card name is about 140 characters; anything longer isn't a call.
export const MAX_CALL_LENGTH = 150;

export function findCalls(text: string): string[] {
  const escaped = [...text.matchAll(ESCAPED_CALL)].map((m) => m[1]!.replace(/\\(.)/g, '$1'));
  const plain = [...text.matchAll(PLAIN_CALL)].map((m) => m[1]!);
  return [...escaped, ...plain]
    .map((call) => call.trim())
    .filter((call) => call !== '' && call.length <= MAX_CALL_LENGTH);
}

const WEEKLY_UNJERK = /weekly.*unjerk/i;
const BOTTOM_SCORING = /bottom.*scoring/i;

export const IGNORED_AUTHORS = ['mtgcardbelcher', 'mtgcardfetcher'];

// Triggers can arrive late; anything older than this is not answered.
export const MAX_ITEM_AGE_MS = 10 * 60 * 1000;

export interface CallItem {
  kind: 'comment' | 'post';
  authorName: string;
  createdAtMs: number;
  /** The comment's parent post title, or the post's own title. */
  postTitle: string;
}

export type SkipReason = 'too-old' | 'ignored-author' | 'no-calls' | 'excluded-thread';

/**
 * Why an item gets no reply, or undefined if it should get one.
 * `appUsername` is the app's own account, which is skipped like the PRAW bots.
 */
export function skipReason(item: CallItem, calls: string[], appUsername: string, nowMs: number): SkipReason | undefined {
  if (nowMs - item.createdAtMs > MAX_ITEM_AGE_MS) return 'too-old';
  const author = item.authorName.toLowerCase();
  if (author === appUsername.toLowerCase() || IGNORED_AUTHORS.includes(author)) return 'ignored-author';
  if (calls.length === 0) return 'no-calls';
  const exclusions = item.kind === 'post' ? [WEEKLY_UNJERK, BOTTOM_SCORING] : [WEEKLY_UNJERK];
  if (exclusions.some((re) => re.test(item.postTitle))) return 'excluded-thread';
  return undefined;
}
