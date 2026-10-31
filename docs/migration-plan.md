# MTGCardBelcher: migration plan

Goal: replace the PRAW bot with a Devvit app installed on each subreddit it serves, with the same behaviour ([features.md](features.md)) and no server of our own.

This is a standalone repo: it doesn't depend on `devvit-apps`. The platform knowledge in `devvit-apps/docs/devvit-app-conventions.md` still applies, and the parts this plan relies on are restated here.

## Shape of the app

One app, installed on four subreddits. What each install does depends on which subreddit it is installed on:

| Install | Replies to calls | Builds image pool | Curates flairs |
|---|---|---|---|
| r/magicthecirclejerking, r/edhcirclejerk, r/MTGCardBelcher_dev | yes | yes | no |
| r/MTGCardBelcher | no | no | yes |

- **Calls come in as triggers:** `onCommentCreate` and `onPostCreate`. These replace the PRAW streams and all the reconnect logic. Each install keeps a Redis key for every item it has already replied to, with a 1-day expiry, because triggers aren't guaranteed to be delivered exactly once.
- **The image pool is a Redis hash, kept and added to.** Each replying install keeps its own pool, because Devvit's Redis is separate for each install. The hash maps post ID → image URL, plus the Jollyver image, which is always in it. Reading another subreddit's posts from an install works (`devvit-apps` spike S2).
  - **Seeding:** the first run reads r/MTGCardBelcher's newest 1,000 posts once and adds every eligible image.
  - **After that,** a 30-minute cron reads r/MTGCardBelcher from newest to oldest and stops at the first post older than 15 days. That window is enough because a post's flair only changes in its first two weeks: after 2 weeks pending, it is rejected. New posts arrive about once a month, so a normal run reads one page.
  - **Each run** adds posts flaired *approved* that pass the image checks, and removes posts in the window that no longer have that flair.
  - **Trade-off:** an older image that a moderator later reflairs or deletes stays in the pool. A moderator menu action, "Rebuild image pool", would redo the seeding scan when that matters.
- **Curation runs only in the r/MTGCardBelcher install**, because changing flairs needs mod powers in that subreddit. It runs on the same cron, over the same 15-day window.
- **Collector numbers have to be shared across installs**, so they stay in Reddit comments as they are today: read the body, add one, edit the comment. Editing the app's own comment in another subreddit works (spike S2). The existing counter comments belong to u/MTGCardBelcher, so the app can only edit them after Reddit moves the app onto that account (see Cutover). Until then, the counter comment IDs come from a setting that points at test comments.
- **Cooldowns are a Redis key with a random expiry** (10 min to 2 h), one per collectible per install, so each subreddit has its own cooldown. An art reply sets the key, and while it exists, calls get the waiting reply.
- **Scryfall is optional.** Its domain, `api.scryfall.com`, may not be approved, so nothing waits on the review and the app works without it:
  - **With approval,** each reply makes up to two requests: one `POST /cards/collection` for every name in the call (up to 75 per request) instead of one request per name, and one `GET /cards/random?q=has:flavor` when there is a single call. Both are bounded by a timeout, and a failure only drops the Scryfall parts of the reply, as it does today.
  - **Without approval,** replies have no `[SF]` links and no flavour line. The PRAW bot's "Scryfall is not there" fallback line is left out too, since it would appear on every single-card reply.
  - **If the domain is refused,** remove it from `devvit.json`, turn the Scryfall client off with a constant, and drop the terms of service and privacy policy if nothing else uses fetch.

## Code layout

Same pattern as the `devvit-apps` bots: the decisions are pure functions, and I/O goes through ports that are passed in.

```
src/server/
  calls.ts        parse brackets, apply skip rules            (pure)
  reply.ts        build reply text from calls + lookups + rng (pure)
  data/           creature types, headers, Rastamon cards, ASCII art (pure)
  curation.ts     flair transition for one post               (pure)
  scryfall.ts     collection + random-flavour client          (fetch port)
  collectibles.ts cooldown + counter                          (redis, reddit ports)
  routes/         trigger and scheduler handlers              (thin)
```

`reply.ts` takes its random number generator as an argument, so tests can force the 1-in-1,002 branches.

## Steps

1. **Register the app (Greg).** Create the app on the developer portal under a temporary name, since the account name `mtgcardbelcher` is already taken by the PRAW bot. Then run `npx devvit@latest init <code>` in this repo using the **Mod Tool Simple** template, and delete the nested `.git` it creates.
2. **Submit the fetch domain early, then don't wait for it.** Add `api.scryfall.com` to `permissions.http.domains` and write the README's `## Fetch Domains` section and App Migration Program note. Apps that use fetch also need terms of service and a privacy policy: adapt the ones in `devvit-apps/docs/legal/`. Then `npx devvit upload`, which starts Reddit's review of the domain (1–2 business days). Steps 3–7 go ahead either way.
3. **Port the pure logic with tests:** parsing, skip rules, reply builder, data tables, curation rules. Most of the work is here, and none of it needs the platform.
4. **Scryfall client.** Include the `User-Agent` and `Accept` headers Scryfall asks for.
5. **Triggers → reply.** Include the 10-minute age guard, the dedup key, and skipping the app's own account (looked up at runtime, not hard-coded) plus u/MTGCardBelcher and u/MTGCardFetcher.
6. **Cron: pool update and curation**, with a short Redis lock so overlapping runs don't both act (see the 30-second limit in the conventions doc). Also the seeding scan and the "Rebuild image pool" menu action.
7. **Collectibles:** cooldown, counter comment and art reply.
8. **Playtest on r/MTGCardBelcher_dev**, and settle the open questions below there.
9. **Cutover:** see below.

## Open questions to settle in playtest

- **Upvote ratio.** Approving an image needs ratio ≥ 0.85, but Devvit's `Post` object doesn't expose it. The ratio is in the lower-level data Devvit receives (`upvoteRatio` in `@devvit/protos` listing messages). Find out whether it can be read. If it can't, decide whether approval should use score alone.
- **User-Agent.** Does Devvit's `fetch` send our `User-Agent` header, or replace it? Scryfall may block requests without a proper one.
- **Seeding time.** Can the one-off 1,000-post seeding scan (10 pages) finish within the 30-second limit? If not, split it across chained scheduler runs. Normal runs read one page, so they are not at risk.
- **Escaped brackets.** Does the comment body in a trigger contain `\[\[`, as the API gives PRAW? Test with a call typed in new Reddit's rich-text editor.
- **Collection lookup.** Does `/cards/collection` match names the way `/cards/named?exact=` does (ignoring case, handling `//` split names)?

## Cutover

1. `devvit publish` (unlisted), and apply to the App Migration Program to move the app onto the u/MTGCardBelcher account. Once that's done, set `name` in `devvit.json` to the new slug and point the counter setting at the original comment IDs.
2. **Coordinate with u/MustaKotka**, who runs the PRAW bot, and the moderators of each subreddit. They install the app, and the PRAW bot stops **at the same time**, so the two never both reply to a call.
3. Watch `devvit logs` for the first day. The curation counts should match what the PRAW bot's logs showed.

## Decisions made

- **Replies use links**, as today. Embedding images in comments is possible with `media.upload` and rich text, but it's left for later.
- **The capitalisation quirk is fixed** (features.md §5).
- **Cooldowns are per subreddit.**
- **Logging is `devvit logs` only.** There is no telemetry package.
- **The image pool is kept in Redis** and updated from recent posts, not rebuilt from 1,000 posts each run.
- **Scryfall is attempted but optional.**
