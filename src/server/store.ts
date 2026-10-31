// Everything the app keeps in its per-install Redis.

import { JOLLYVER, type PoolChanges } from './curation';

/** The slice of Devvit's Redis client this app uses, so tests can pass a fake. */
export interface RedisPort {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, options?: { nx?: boolean; expiration?: Date }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, fieldValues: Record<string, string>): Promise<unknown>;
  hDel(key: string, fields: string[]): Promise<unknown>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const KEYS = {
  replied: (itemId: string) => `replied:${itemId}`,
  cooldown: (collectibleId: string) => `cooldown:${collectibleId}`,
  pool: 'pool',
  // The cursor of the next page to read while seeding; absent once seeding is done.
  seedCursor: 'pool:seed-cursor',
  seeded: 'pool:seeded',
  resetRequested: 'pool:reset-requested',
  lock: 'lock:pool-tick',
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

  /** The joke image URLs to pick from, always including Jollyver. */
  async pool(): Promise<string[]> {
    return [JOLLYVER, ...Object.values(await this.redis.hGetAll(KEYS.pool))];
  }

  async applyPoolChanges(changes: PoolChanges): Promise<void> {
    if (changes.add.size > 0) await this.redis.hSet(KEYS.pool, Object.fromEntries(changes.add));
    if (changes.remove.length > 0) await this.redis.hDel(KEYS.pool, changes.remove);
  }

  async seeded(): Promise<boolean> {
    return (await this.redis.get(KEYS.seeded)) !== undefined;
  }

  async seedCursor(): Promise<string | undefined> {
    return this.redis.get(KEYS.seedCursor);
  }

  async setSeedCursor(cursor: string): Promise<void> {
    await this.redis.set(KEYS.seedCursor, cursor);
  }

  async finishSeeding(): Promise<void> {
    await this.redis.set(KEYS.seeded, '1');
    await this.redis.del(KEYS.seedCursor);
  }

  /** Empties the pool and starts seeding again from the newest post. */
  async resetPool(): Promise<void> {
    await this.redis.del(KEYS.pool, KEYS.seeded, KEYS.seedCursor);
  }

  /** Asks the next pool tick to reset the pool before it runs. */
  async requestReset(): Promise<void> {
    await this.redis.set(KEYS.resetRequested, '1');
  }

  /** True, once, if a reset was requested. */
  async takeResetRequest(): Promise<boolean> {
    if ((await this.redis.get(KEYS.resetRequested)) === undefined) return false;
    await this.redis.del(KEYS.resetRequested);
    return true;
  }

  /**
   * Takes the pool-tick lock, returning a release function, or undefined if
   * another tick holds it. The TTL outlives a 30-second handler, so a live
   * tick never loses it, and clears long before the next cron fire.
   */
  async lockPoolTick(): Promise<(() => Promise<void>) | undefined> {
    const key = KEYS.lock;
    const token = `${this.now()}-${Math.random()}`;
    if (!(await this.claim(key, new Date(this.now() + 60_000), token))) return undefined;
    return async () => {
      if ((await this.redis.get(key)) === token) await this.redis.del(key);
    };
  }

  // Redis's return value for a refused nx set isn't documented, so write a
  // unique token and read it back to see who owns the key.
  private async claim(key: string, expiration: Date, token = `${this.now()}-${Math.random()}`): Promise<boolean> {
    await this.redis.set(key, token, { nx: true, expiration });
    return (await this.redis.get(key)) === token;
  }
}
