// Everything the app keeps in its per-install Redis.

import { JOLLYVER } from './image-pool';

/** The slice of Devvit's Redis client this app uses, so tests can pass a fake. */
export interface RedisPort {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, options?: { nx?: boolean; expiration?: Date }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const KEYS = {
  replied: (itemId: string) => `replied:${itemId}`,
  cooldown: (collectibleId: string) => `cooldown:${collectibleId}`,
  rateLimitedUntil: 'rate-limited-until',
  // The image URLs from the last full scan of r/MTGCardBelcher, one per line.
  pool: 'pool:images',
};

export class Store {
  constructor(
    private readonly redis: RedisPort,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Claims an item for a reply, for one day. False if it was already claimed,
   * so a trigger delivered twice gets one reply.
   */
  async claimReply(itemId: string): Promise<boolean> {
    return this.claim(KEYS.replied(itemId), new Date(this.now() + DAY_MS));
  }

  /**
   * Starts a collectible's cooldown if it isn't running. True if this call
   * started it, so of two calls at the same moment only one wins the art.
   */
  async claimCooldown(collectibleId: string, seconds: number): Promise<boolean> {
    return this.claim(KEYS.cooldown(collectibleId), new Date(this.now() + seconds * 1000));
  }

  async endCooldown(collectibleId: string): Promise<void> {
    await this.redis.del(KEYS.cooldown(collectibleId));
  }

  /** When Reddit's rate limit on the app's comments ends, if one is in force. */
  async rateLimitedUntil(): Promise<number | undefined> {
    const until = Number(await this.redis.get(KEYS.rateLimitedUntil));
    return until > this.now() ? until : undefined;
  }

  async setRateLimitedUntil(untilMs: number): Promise<void> {
    await this.redis.set(KEYS.rateLimitedUntil, String(untilMs), { expiration: new Date(untilMs) });
  }

  /** The joke image URLs to pick from, always including Jollyver. */
  async pool(): Promise<string[]> {
    const cached = (await this.redis.get(KEYS.pool)) ?? '';
    return [JOLLYVER, ...cached.split('\n').filter((url) => url !== '')];
  }

  async setPool(urls: string[]): Promise<void> {
    await this.redis.set(KEYS.pool, urls.join('\n'));
  }

  // Redis's return value for a refused nx set isn't documented, so write a
  // unique token and read it back to see who owns the key.
  private async claim(key: string, expiration: Date, token = this.token()): Promise<boolean> {
    await this.redis.set(key, token, { nx: true, expiration });
    return (await this.redis.get(key)) === token;
  }

  private token(): string {
    return `${this.now()}-${Math.random()}`;
  }
}
