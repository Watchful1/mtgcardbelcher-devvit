// `npm run build` doesn't read devvit.json: a misspelled key fails only at
// upload, and an endpoint no route serves is accepted everywhere and never
// fires. These tests check both.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';

import { COLLECTOR_NUMBER_SETTINGS, CURATION_DRY_RUN_SETTING, isDryRun } from './server/config';
import { COLLECTIBLES } from './server/data/collectibles';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = (path: string) => JSON.parse(readFileSync(`${root}${path}`, 'utf8'));

interface Config {
  triggers: Record<string, string>;
  scheduler: { tasks: Record<string, { endpoint: string; cron?: string }> };
  menu: { items: { endpoint: string }[] };
  settings: {
    global: Record<string, { type: string; defaultValue?: unknown }>;
    subreddit: Record<string, { fields: Record<string, { defaultValue?: unknown }> }>;
  };
}
const config = readJson('devvit.json') as Config;

test('devvit.json matches the schema Devvit ships', () => {
  const schema = readJson('node_modules/@devvit/shared-types/schemas/config-file.v1.json');
  // ajv 6 doesn't know draft 2020-12; the parts this app uses validate without it.
  delete schema.$schema;
  const ajv = new Ajv({ allErrors: true, validateSchema: false, unknownFormats: 'ignore', logger: false });
  ajv.addSchema({}, 'https://developers.reddit.com/schema/products.json');
  const validate = ajv.compile(schema);
  assert.ok(validate(config), JSON.stringify(validate.errors, null, 2));
});

/** Asserts a route file registers `endpoint`, given where index.ts mounts it. */
function assertServed(endpoint: string, mount: string, file: string, router: string): void {
  assert.ok(endpoint.startsWith(`${mount}/`), `${endpoint} is not under ${mount}`);
  const source = readFileSync(`${root}src/routes/${file}`, 'utf8');
  const path = endpoint.slice(mount.length);
  assert.ok(source.includes(`${router}.post('${path}'`), `${endpoint} is not served by src/routes/${file}`);
}

test('every trigger, task and menu endpoint is served', () => {
  for (const endpoint of Object.values(config.triggers)) {
    assertServed(endpoint, '/internal/triggers', 'triggers.ts', 'triggers');
  }
  for (const { endpoint } of Object.values(config.scheduler.tasks)) {
    assertServed(endpoint, '/internal/scheduler', 'scheduler.ts', 'scheduler');
  }
  for (const { endpoint } of config.menu.items) {
    assertServed(endpoint, '/internal/menu', 'menu.ts', 'menu');
  }
});

test('curation dry run is declared as text, and on by default', () => {
  const setting = config.settings.global[CURATION_DRY_RUN_SETTING];
  assert.equal(setting?.type, 'string');
  assert.ok(isDryRun(setting.defaultValue));
});

test("each collector number setting is declared, defaulting to the original bot's last number", () => {
  const fields = config.settings.subreddit['collectorNumbers']!.fields;
  for (const collectible of COLLECTIBLES) {
    const name = COLLECTOR_NUMBER_SETTINGS[collectible.id];
    assert.equal(fields[name]?.defaultValue, collectible.lastPrawNumber, `${name}`);
  }
});
