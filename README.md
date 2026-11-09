# MTGCardBelcher

A joke bot for r/magicthecirclejerking and friends. Call a card with `[[double brackets]]` in a comment or post, and it replies with a random joke card image from the curated submissions in r/MTGCardBelcher, plus a link to the real card if one exists.

It runs on [Devvit](https://developers.reddit.com/docs/), Reddit's app platform: a moderator installs the app on a subreddit, and Reddit runs it there. There is no server to host. It replaces the original Python bot, [AetheriumSlinky/MTGCardBelcher](https://github.com/AetheriumSlinky/MTGCardBelcher).

## What each install does

The app does different jobs depending on the subreddit it's installed on:

| Installed on | What it does |
|---|---|
| r/MTGCardBelcher | Curates image submissions by flair (*new* → *pending* once a moderator approves the post → *approved* at score 50, or *rejected* after two weeks), and keeps the image pool on the wiki page `mtgcardbelcher/image-pool`. It answers no calls. |
| Any other subreddit | Answers `[[calls]]` in new comments and self-posts, picking joke images from the pool it reads from that wiki page every 30 minutes. |

To serve a new subreddit, install the app there: no code changes. Install it on r/MTGCardBelcher first, because the other installs read their images from there. The app account must be a moderator of r/MTGCardBelcher.

[docs/features.md](docs/features.md) describes every reply and rule in detail.

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
| Which posts count as pool images | `src/server/image-pool.ts` |
| Scryfall lookups | `src/server/scryfall.ts` |
| What happens on a trigger, cron run or menu click | `src/routes/` (each endpoint), then `src/server/devvit/` |

`devvit.json` declares everything Reddit calls: triggers, the 30-minute scheduler task, menu items and settings. Each points at an `/internal/…` route that `src/index.ts` mounts from `src/routes/`. A test (`src/routes/config.test.ts`) checks that every route exists and that `devvit.json` is valid.

## Configuration

**Settings** are global, so they apply to every install. Set one with `npx devvit settings set <name>` from the repo, which then asks for the value.

| Setting | What it does |
|---|---|
| `dreadmawCounterCommentId`, `stormCrowCounterCommentId`, `negateCounterCommentId` | The comment whose body holds each collectible's collector number. With or without `t1_`. Unset, calls for that card always get the "waiting" reply. The app can only edit comments it wrote. |
| `curationDryRun` | On by default. While on, curation logs the flair changes it would make (`Dry run: would set flair of …`) and makes none. Turn it off once a run's log looks right. |

**Moderator menu items:**
- **Rebuild MTGCardBelcher image pool** (subreddit menu). On r/MTGCardBelcher it rebuilds the pool from the newest 1,000 posts. Elsewhere it reloads the pool from the wiki page straight away.
- **Create MTGCardBelcher collector counters** (post menu). The app posts one counter comment per collectible under that post, each starting at the original bot's count, and logs their ids for the settings above.

**Flair templates** on r/MTGCardBelcher are referred to by id in `src/server/flair-rules.ts`. Recreating a template there gives it a new id, so the code has to be updated with it.

[docs/operations.md](docs/operations.md) covers logs, diagnosing problems and rate limits.

## Development

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

## Docs

- [docs/features.md](docs/features.md): what the bot does, rule by rule. **Reference.**
- [docs/operations.md](docs/operations.md): running it day to day. **Reference.**
- [docs/handover.md](docs/handover.md): moving the app and repo to the original bot's owner.
- [docs/migration-plan.md](docs/migration-plan.md) and [docs/runbooks/playtest.md](docs/runbooks/playtest.md): how the port from Python was planned and tested. **History.**

## App Migration Program

This app replaces the Data API bot u/MTGCardBelcher, a PRAW script. It runs under the temporary name `mtgcardbelcher-dev` until Reddit moves it onto the u/MTGCardBelcher account.

## Fetch Domains

| Domain | Why |
|---|---|
| `api.scryfall.com` | Looks up whether each called name is a real Magic card, so the reply can link to the real card's image, and fetches a random flavour text for single-card replies. At most one `POST /cards/collection` and one `GET /cards/random` per reply, with the header `User-Agent: MTGCardBelcher/2.0`. The only user data sent is the card names typed in the call. |

## Terms and privacy

- [Terms of Service](docs/legal/terms.md)
- [Privacy Policy](docs/legal/privacy-policy.md)

## License

GPL-3.0, as the original bot. See [LICENSE](LICENSE).
