// Collector numbers for the collectible art: the moderators' setting, which
// the next number must be higher than. The count itself is in the store.

import { settings } from '@devvit/web/server';

import { COLLECTOR_NUMBER_SETTINGS } from '../config';
import type { Collectible } from '../data/collectibles';

export async function collectorNumberFloor(collectible: Collectible): Promise<number> {
  const setting = await settings.get<number>(COLLECTOR_NUMBER_SETTINGS[collectible.id]);
  return typeof setting === 'number' && Number.isFinite(setting) ? setting : collectible.lastPrawNumber;
}
