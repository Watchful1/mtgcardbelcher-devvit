# Development

How the code is laid out, how the app is configured, and how to test and release it.

## Where things live

All code is in `src/`. Everything under `src/server/` except `src/server/devvit/` is plain TypeScript with no Devvit calls, so tests run it directly. The Devvit-specific code is passed in as functions, called "ports" in the code.

| To change… | Look in |
|---|---|
| Headers, creature types, the linkless replies, the footer | `src/server/data/reply-texts.ts` |
| Rastamon's cards and header | `src/server/data/rastamon.ts` |
| Colossal Dreadmaw, Storm Crow, Negate (spellings, art, cooldown, waiting replies) | `src/server/data/collectibles.ts`, `src/server/data/art.ts` |
| How calls are found, skipped threads, ignored authors | `src/server/calls.ts` |
| How a reply is put together, the 8-call and 2,400-character limits, the "No-one is home" replies | `src/server/reply.ts` |
| Score threshold, flair template ids, the curation rules | `src/server/flair-rules.ts` |
| Which posts count as pool images, and the 30-minute scan | `src/server/image-pool.ts` |
| The order things happen in when answering a call | `src/server/respond.ts` |
| What the app stores in Redis, and collector numbers | `src/server/store.ts` |
| Waiting out Reddit's rate limits | `src/server/rate-limit.ts` |
| Scryfall lookups | `src/server/scryfall.ts` |
| Settings | `devvit.json` and `src/server/config.ts` |
| What happens on a trigger, cron run or menu click | `src/routes/` (each endpoint), then `src/server/devvit/` |

`devvit.json` declares everything Reddit calls: triggers, the 30-minute scheduler task, menu items and settings. Each points at an `/internal/…` route that `src/index.ts` mounts from `src/routes/`. A test (`src/devvit-json.test.ts`) checks that every route exists and that `devvit.json` is valid.

**To add a custom card,** copy an entry in `RASTAMON_CARDS`. Spellings are lowercase, and the reply gets the Rastamon header.

## Access

- **Publishing and playtesting** work only for the app's owner on developers.reddit.com, logged in with `npm run login`. `npx devvit whoami` shows who you are. Owning this repo doesn't make you the app's owner.
- **Installing** also needs full moderator permissions on the subreddit.
- **If the repo moves,** update the terms and privacy links on the app's developer settings page.

## Configuration

**Global settings** apply to every install. Set one with `npx devvit settings set <name>` from the repo, which then asks for the value. `npx devvit settings list` shows the settings, but not their values.

| Setting | What it does |
|---|---|
| `curationDryRun` | On by default. While on, curation logs the flair changes it would make (`Dry run: would set flair of …`) and makes none. Type `false` to turn it off, once a run's log looks right, or `true` to turn it back on. The scan's log shows which it is: `Dry run:` lines or `Set flair` lines, if any post needs a change. |

**Subreddit settings** are set by each subreddit's moderators, in the app's install settings there:

| Setting | What it does |
|---|---|
| `dreadmawCollectorNumber`, `stormCrowCollectorNumber`, `negateCollectorNumber` | The last collector number delivered for each card. The next win gets a higher number than this and the count the app keeps in Redis. Defaults to the original bot's last numbers, `lastPrawNumber` in `src/server/data/collectibles.ts`. |

**Flair templates** on r/MTGCardBelcher are referred to by id (`FLAIRS` in `src/server/flair-rules.ts`). Recreating a template there gives it a new id, so the code has to be updated with it.

## Testing

You need Node 24 (see `.nvmrc`). Clone the repo, then:

```bash
npm ci             # install the dependencies
npm run login      # once, to log in to Devvit
npm run verify     # type-check, lint, format check, test, build: run before every release
npm run prettier   # format the code
npm test           # tests only
node --import tsx --test src/server/reply.test.ts   # one test file
npm run dev        # playtest on the dev subreddit in devvit.json
```

`npm run dev` installs your working copy on r/MTGCardBelcher_dev, where you must be a moderator, and updates it as you save. Curation can't be playtested there, because it runs only on r/MTGCardBelcher.

## Releasing

```bash
npm run launch
```

This runs `verify`, then `devvit publish`: a new version is built from your working copy, uploaded with its source, and sent to Reddit for review. Run it from an up-to-date `main` with nothing uncommitted. The command picks the version number; the one in `package.json` isn't used. Approval usually takes hours to a day.

Publishing doesn't upgrade existing installs. Update each one, r/MTGCardBelcher and r/magicthecirclejerking, as a moderator there:

```bash
npx devvit install MTGCardBelcher mtgcardbelcher@latest
npx devvit install magicthecirclejerking mtgcardbelcher@latest
```

If the command names an older version, the new one isn't approved yet. The app is unlisted, so other moderators can't install or update it. To let them, ask r/Devvit modmail for Public Limited mode, or list the app publicly with `npx devvit publish --public`.
