// Shared Devvit plumbing: this install's store, and the app's own username.

import { context, reddit, redis } from '@devvit/web/server';

import { Store, type RedisPort } from '../store';

export function store(): Store {
  return new Store(redis as RedisPort);
}

let cachedUsername: string | undefined;

/** The app account's username, which the app must not reply to. */
export async function appUsername(): Promise<string> {
  cachedUsername ??= (await reddit.getAppUser())?.username ?? context.appSlug;
  return cachedUsername;
}
