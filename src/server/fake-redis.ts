// An in-memory stand-in for Devvit's Redis, for tests.

import type { RedisPort } from './store';

export class FakeRedis implements RedisPort {
  readonly strings = new Map<string, { value: string; expiresAt: number | undefined }>();
  readonly hashes = new Map<string, Map<string, string>>();

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
    for (const key of keys) {
      this.strings.delete(key);
      this.hashes.delete(key);
    }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return Object.fromEntries(this.hashes.get(key) ?? []);
  }

  async hSet(key: string, fieldValues: Record<string, string>): Promise<void> {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    for (const [field, value] of Object.entries(fieldValues)) hash.set(field, value);
    this.hashes.set(key, hash);
  }

  async hDel(key: string, fields: string[]): Promise<void> {
    for (const field of fields) this.hashes.get(key)?.delete(field);
  }
}
