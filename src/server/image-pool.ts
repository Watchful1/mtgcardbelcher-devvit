// The joke image pool: approved posts on the source subreddit (r/MTGCardBelcher)
// that link straight to an image. The source subreddit's install keeps it and
// publishes it to a wiki page there; every other install reads that page.

import type { Source, SourcePost } from './flair-rules';

// Always in the pool, in memory of u/MTGLardFetcher.
export const JOLLYVER = 'https://i.redd.it/pcmd6d3o1oad1.png';

export const POOL_WIKI_PAGE = 'mtgcardbelcher/image-pool';

/** What the pool needs to know about a post. `removed` defaults to false. */
export type PoolPost = Pick<SourcePost, 'id' | 'flairId' | 'url'> & { removed?: boolean };

/** A direct link to an image hosted on Reddit or Imgur. */
export function isImageUrl(url: string): boolean {
  return /^https:\/\/(i\.redd\.it|i\.imgur\.com)\//.test(url);
}

/** Approved posts, not removed by a moderator, linking straight to an image. Self-posts link to the subreddit. */
export function isPoolImage(post: Omit<PoolPost, 'id'>, source: Source): boolean {
  return (
    post.flairId === source.flairs.approved &&
    !post.removed &&
    !post.url.toLowerCase().includes(source.subredditName.toLowerCase()) &&
    isImageUrl(post.url)
  );
}

export interface PoolChanges {
  /** Post id → image URL. */
  add: Map<string, string>;
  remove: string[];
}

/** For each post seen: add it if it's a pool image, otherwise remove it. */
export function poolChanges(posts: PoolPost[], source: Source): PoolChanges {
  const changes: PoolChanges = { add: new Map(), remove: [] };
  for (const post of posts) {
    if (isPoolImage(post, source)) changes.add.set(post.id, post.url);
    else changes.remove.push(post.id);
  }
  return changes;
}

const PAGE_HEADER =
  '# MTGCardBelcher image pool. The MTGCardBelcher app writes this page; edits are overwritten.\n';

/** The wiki page's text: a header line, then one image URL per line, sorted. */
export function formatPoolPage(urls: Iterable<string>): string {
  return PAGE_HEADER + [...new Set(urls)].sort().join('\n') + '\n';
}

/**
 * The image URLs on the wiki page. Anything that isn't a Reddit or Imgur image
 * link is skipped, so an edit to the page can't put other links in replies.
 */
export function parsePoolPage(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(isImageUrl);
}
