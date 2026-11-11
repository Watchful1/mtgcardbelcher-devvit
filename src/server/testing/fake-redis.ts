// An in-memory stand-in for Devvit's Redis, for tests.

import type { RedisPort } from '../store';

export class FakeRedis implements RedisPort {
  private readonly strings = new Map<string, { value: string; expiresAt: number | undefined }>();

  constructor(private readonly now: () => number = Date.now) {}

  async get(key: string): Promise<string | undefined> {
    const entry = this.strings.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== undefined && entry.expiresAt <= this.now()) {
      this.strings.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: string, options?: { nx?: boolean; expiration?: Date }): Promise<void> {
    if (options?.nx && (await this.get(key)) !== undefined) return;
    this.strings.set(key, { value, expiresAt: options?.expiration?.getTime() });
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) this.strings.delete(key);
  }
}
