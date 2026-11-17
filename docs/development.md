# Development

How the code is laid out, how the app is configured, and how to test and release it.

## Where things live

All code is in `src/`. Everything under `src/server/` except `src/server/devvit/` is plain TypeScript with no Devvit calls, so tests run it directly. The Devvit-specific code is passed in as functions, called "ports" in the code.

| To change… | Look in |
|---|---|
| Reply texts, headers, creature types, the footer | `src/server/data/replies.ts` |
| Rastamon's cards | `src/server/data/rastamon.ts` |
| Colossal Dreadmaw, Storm Crow, Negate (spellings, art, cooldown) | `src/server/data/collectibles.ts`, `src/server/data/art.ts` |
| How calls are found, skipped threads, ignored authors | `src/server/calls.ts` |
| How a reply is put together, the 8-call and 2,400-character limits | `src/server/reply.ts` |
| Score threshold, flair template ids, the curation rules | `src/server/flair-rules.ts` |
| Which posts count as pool images, and the 30-minute scan | `src/server/image-pool.ts` |
| Scryfall lookups | `src/server/scryfall.ts` |
| What happens on a trigger, cron run or menu click | `src/routes/` (each endpoint), then `src/server/devvit/` |

`devvit.json` declares everything Reddit calls: triggers, the 30-minute scheduler task, menu items and settings. Each points at an `/internal/…` route that `src/index.ts` mounts from `src/routes/`. A test (`src/routes/config.test.ts`) checks that every route exists and that `devvit.json` is valid.

## Configuration

**Settings** are global, so they apply to every install. Set one with `npx devvit settings set <name>` from the repo, which then asks for the value.

| Setting | What it does |
|---|---|
| `dreadmawCounterCommentId`, `stormCrowCounterCommentId`, `negateCounterCommentId` | The comment whose body holds each collectible's collector number. With or without `t1_`. Unset, calls for that card always get the "waiting" reply. The app can only edit comments it wrote. |
| `curationDryRun` | On by default. While on, curation logs the flair changes it would make (`Dry run: would set flair of …`) and makes none. Turn it off once a run's log looks right. |

**Flair templates** on r/MTGCardBelcher are referred to by id (`FLAIRS` in `src/server/flair-rules.ts`). Recreating a template there gives it a new id, so the code has to be updated with it.

## Testing

You need Node 24 (see `.nvmrc`). Then:

```bash
npm install
npm run verify     # type-check, lint, test, build: run before every release
npm test           # tests only
node --import tsx --test src/server/reply.test.ts   # one test file
npm run dev        # playtest on the dev subreddit in devvit.json
```

Log in to Devvit once with `npm run login`.

## Releasing

```bash
npm run launch
```

This runs `verify`, then `devvit publish`: a new version is built from your working copy, uploaded with its source, and sent to Reddit for review. Run it from an up-to-date `main` with nothing uncommitted. Approval usually takes hours to a day. Publishing doesn't upgrade existing installs by itself. To move a subreddit you moderate onto the newest version, run `npx devvit install <subreddit> mtgcardbelcher-dev@latest`; other subreddits' moderators update it from the app's page on developers.reddit.com.
