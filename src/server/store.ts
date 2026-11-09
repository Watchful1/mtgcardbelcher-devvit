// Everything the app keeps in its per-install Redis.

import { JOLLYVER, type PoolChanges } from './image-pool';

/** The slice of Devvit's Redis client this app uses, so tests can pass a fake. */
export interface RedisPort {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, options?: { nx?: boolean; expiration?: Date }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, fieldValues: Record<string, string>): Promise<unknown>;
  hDel(key: string, fields: string[]): Promise<unknown>;
}

/** How far seeding the source pool has got: the listing cursor and pages read so far. */
export interface SeedProgress {
  after: string;
  pages: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const KEYS = {
  // On every install.
  replied: (itemId: string) => `replied:${itemId}`,
  cooldown: (collectibleId: string) => `cooldown:${collectibleId}`,
  rateLimitedUntil: 'rate-limited-until',
  lock: 'lock:pool-tick',
  // On installs that answer calls: the image URLs read from the wiki page, one per line.
  poolCache: 'pool:images',
  // On the r/MTGCardBelcher install: the pool itself, as a hash of post id → image URL.
  sourcePool: 'source:pool',
  sourceSeeded: 'source:seeded',
  sourceSeedProgress: 'source:seed-progress',
  sourceResetRequested: 'source:reset-requested',
  sourcePageSettings: 'source:page-settings-applied',
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
    const cached = (await this.redis.get(KEYS.poolCache)) ?? '';
    return [JOLLYVER, ...cached.split('\n').filter((url) => url !== '')];
  }

  async setPool(urls: string[]): Promise<void> {
    await this.redis.set(KEYS.poolCache, urls.join('\n'));
  }

  /** The source pool's image URLs. */
  async sourcePool(): Promise<string[]> {
    return Object.values(await this.redis.hGetAll(KEYS.sourcePool));
  }

  async applySourceChanges(changes: PoolChanges): Promise<void> {
    if (changes.add.size > 0) await this.redis.hSet(KEYS.sourcePool, Object.fromEntries(changes.add));
    if (changes.remove.length > 0) await this.redis.hDel(KEYS.sourcePool, changes.remove);
  }

  async sourceSeeded(): Promise<boolean> {
    return (await this.redis.get(KEYS.sourceSeeded)) !== undefined;
  }

  async seedProgress(): Promise<SeedProgress | undefined> {
    const saved = await this.redis.get(KEYS.sourceSeedProgress);
    return saved ? (JSON.parse(saved) as SeedProgress) : undefined;
  }

  async setSeedProgress(progress: SeedProgress): Promise<void> {
    await this.redis.set(KEYS.sourceSeedProgress, JSON.stringify(progress));
  }

  async finishSeeding(): Promise<void> {
    await this.redis.set(KEYS.sourceSeeded, '1');
    await this.redis.del(KEYS.sourceSeedProgress);
  }

  /** Empties the source pool, so the next run seeds it again from the newest post. */
  async resetSource(): Promise<void> {
    await this.redis.del(KEYS.sourcePool, KEYS.sourceSeeded, KEYS.sourceSeedProgress);
  }

  /** Asks the next pool run to reset the source pool before it runs. */
  async requestReset(): Promise<void> {
    await this.redis.set(KEYS.sourceResetRequested, '1');
  }

  /** True, once, if a reset was requested. */
  async takeResetRequest(): Promise<boolean> {
    if ((await this.redis.get(KEYS.sourceResetRequested)) === undefined) return false;
    await this.redis.del(KEYS.sourceResetRequested);
    return true;
  }

  /** Whether the wiki page's permissions have been set. */
  async pageSettingsApplied(): Promise<boolean> {
    return (await this.redis.get(KEYS.sourcePageSettings)) !== undefined;
  }

  async setPageSettingsApplied(): Promise<void> {
    await this.redis.set(KEYS.sourcePageSettings, '1');
  }

  /**
   * Takes the pool-run lock, returning a release function, or undefined if
   * another run holds it. The lock outlives a 30-second handler, so a live run
   * never loses it, and clears long before the next cron fire.
   */
  async lockPoolTick(): Promise<(() => Promise<void>) | undefined> {
    const key = KEYS.lock;
    const token = this.token();
    if (!(await this.claim(key, new Date(this.now() + 60_000), token))) return undefined;
    return async () => {
      if ((await this.redis.get(key)) === token) await this.redis.del(key);
    };
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
