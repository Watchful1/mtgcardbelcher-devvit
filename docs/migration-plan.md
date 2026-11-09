# MTGCardBelcher: migration plan

> **History.** This is how the port from the Python bot was planned, in October and November 2026, by u/Watchful1. Some of it was superseded later, as noted. For how the bot works now, see the [README](../README.md), [features.md](features.md) and [operations.md](operations.md).

Goal: replace the PRAW bot with a Devvit app installed on each subreddit it serves, with the same behaviour ([features.md](features.md)) and no server of our own.

"Spike S2" and similar references below are experiments from u/Watchful1's other Devvit bots, which established what the platform allows.

## Shape of the app

One app, installed on four subreddits. What each install does depends on which subreddit it is installed on:

| Install | Replies to calls | Builds image pool | Curates flairs |
|---|---|---|---|
| r/magicthecirclejerking, r/edhcirclejerk | yes | yes | no |
| r/MTGCardBelcher | no | no | yes |

- **Calls come in as triggers:** `onCommentCreate` and `onPostCreate`. These replace the PRAW streams and all the reconnect logic. Each install keeps a Redis key for every item it has already replied to, with a 1-day expiry, because triggers aren't guaranteed to be delivered exactly once.
- **The image pool is a Redis hash, kept and added to.** _Superseded on 2026-11-08: the r/MTGCardBelcher install now keeps the only pool, updates it from flair-change, mod-action and delete triggers, and publishes it to a wiki page the other installs read (features.md §5)._ Each replying install keeps its own pool, because Devvit's Redis is separate for each install. The hash maps post ID → image URL; Jollyver is added when the pool is read. Reading another subreddit's posts from an install works (`devvit-apps` spike S2).
  - **Seeding:** the first run reads r/MTGCardBelcher's newest 1,000 posts once and adds every eligible image.
  - **After that,** a 30-minute cron reads r/MTGCardBelcher from newest to oldest and stops at the first post older than 15 days. That window is enough because a post's flair only changes in its first two weeks: after 2 weeks pending, it is rejected. New posts arrive about once a month, so a normal run reads one page.
  - **Each run** adds posts flaired *approved* that pass the image checks, and removes posts in the window that no longer have that flair.
  - **Trade-off:** an older image that a moderator later reflairs stays in the pool, and so does any deleted image, since deleted posts drop out of the listing rather than showing up to be removed. The moderator menu action "Rebuild MTGCardBelcher image pool" redoes the seeding scan. The wiki-page design removed this trade-off.
- **Curation runs only in the r/MTGCardBelcher install**, because changing flairs needs mod powers in that subreddit. It runs on the same cron, over the same 15-day window.
- **Collector numbers have to be shared across installs**, so they stay in Reddit comments as they are today: read the body, add one, edit the comment. Editing the app's own comment in another subreddit works (spike S2). The existing counter comments belong to u/MTGCardBelcher, so the app can only edit them after Reddit moves the app onto that account (see Cutover). Until then, the counter comment IDs come from a setting that points at test comments.
- **Cooldowns are a Redis key with a random expiry** (10 min to 2 h), one per collectible per install, so each subreddit has its own cooldown. An art reply sets the key, and while it exists, calls get the waiting reply.
- **Scryfall needs no review.** `api.scryfall.com` is on Reddit's global fetch allowlist, so listing it in `devvit.json` is enough. Each reply makes up to two requests: one `POST /cards/collection` for every name in the call (up to 75 per request) instead of one request per name, and one `GET /cards/random?q=has:flavor` when there is a single call. Both are bounded by a timeout, and a failure only drops the Scryfall parts of the reply: no `[SF]` links, and no flavour line. The PRAW bot's "Scryfall is not there" fallback line is left out.

## Code layout

The decisions are pure functions, and Devvit calls go through ports that are passed in. The README's "Where things live" has the current layout.

## Steps

_Status 2026-11-08: steps 1–8 are done. The [playtest](runbooks/playtest.md) passed on r/mtgcardbelcher_de_dev. Curation is untested, since it runs only on r/MTGCardBelcher. Next is the cutover._

1. **Register the app (u/Watchful1).** Create the app on the developer portal under a temporary name, since the account name `mtgcardbelcher` is already taken by the PRAW bot. Then run `npx devvit@latest init <code>` in this repo using the **Mod Tool Simple** template, and delete the nested `.git` it creates.
2. **Fetch domain and legal docs.** Add `api.scryfall.com` to `permissions.http.domains` and write the README's `## Fetch Domains` section and App Migration Program note. It's on the global allowlist, so there's no review to wait for. Apps that use fetch also need terms of service and a privacy policy, linked from the app details page on the portal (`docs/legal/`).
3. **Port the pure logic with tests:** parsing, skip rules, reply builder, data tables, curation rules. Most of the work is here, and none of it needs the platform.
4. **Scryfall client.** Include the `User-Agent` and `Accept` headers Scryfall asks for.
5. **Triggers → reply.** Include the 10-minute age guard, the dedup key, and skipping the app's own account (looked up at runtime, not hard-coded) plus u/MTGCardBelcher and u/MTGCardFetcher.
6. **Cron: pool update and curation**, with a short Redis lock so overlapping runs don't both act (see the 30-second limit in the conventions doc). Also the seeding scan and the "Rebuild image pool" menu action.
7. **Collectibles:** cooldown, counter comment and art reply.
8. **Playtest on r/mtgcardbelcher_de_dev**, the app's own dev subreddit, and settle the open questions below there.
9. **Cutover:** see below.

## Open questions to settle in playtest

- ~~**Upvote ratio.**~~ Decided 2026-11-08: approval uses score ≥ 50 alone. Devvit's `Post` doesn't expose the ratio, and the raw listing data that has it isn't reachable from the app. Moderators can still approve or reject any image by setting its flair by hand. If Devvit ever exposes the ratio, the check goes in `nextFlair` in `src/server/flair-rules.ts`.
- ~~**User-Agent.**~~ Settled in the 2026-11-08 playtest: Scryfall accepted every request, with no `Scryfall … returned` or `failed` line in the log.
- ~~**Seeding time.**~~ Settled in the 2026-11-08 playtest: r/MTGCardBelcher has about 800 posts, and seeding read all 8 pages in one run.
- ~~**Escaped brackets.**~~ Settled in the 2026-11-08 playtest: a call typed in new Reddit's rich-text editor was answered.
- ~~**Trigger timestamps.**~~ Settled in the 2026-11-08 playtest: no fresh comment was skipped as `too-old`.
- **Rate limits.** Found in the 2026-11-08 playtest: Reddit refused the app's second comment within seconds (`RESOURCE_EXHAUSTED: RatelimitError(TimeString="5 seconds")`). Replies and counter comments now wait and retry once. A new app account in a subreddit where it has no karma is limited hardest, so watch for it on the busy subreddits.
- ~~**Collection lookup.**~~ Settled 2026-10-30 against the live API. `/cards/collection` ignores case, returns found cards in request order, and finds double-faced cards by their front face. It doesn't find split cards by their full name ("Fire // Ice"), only by their first face ("Fire"), so the client sends the part before `//`.

## Cutover

1. `devvit publish` (unlisted), and apply to the App Migration Program to move the app onto the u/MTGCardBelcher account. Once that's done, follow [handover.md](handover.md).
2. **Install on r/MTGCardBelcher first**, so the image pool's wiki page exists, and read one curation run's `Dry run:` lines before turning `curationDryRun` off.
3. **Install on the other subreddits** at the same time as u/MustaKotka stops the PRAW bot, so the two never both reply to a call.
4. Watch `devvit logs` for the first day ([operations.md](operations.md)).

## Decisions made

- **Replies use links**, as today. Embedding images in comments is possible with `media.upload` and rich text, but it's left for later.
- **The capitalisation quirk is fixed** (features.md §5).
- **Cooldowns are per subreddit.**
- **Logging is `devvit logs` only.** There is no telemetry package.
- **The image pool is kept, not rebuilt from 1,000 posts each run.** Since 2026-11-08 it is kept by the r/MTGCardBelcher install, updated from flair-change and delete triggers, and shared through a wiki page.
- **Images are approved on score ≥ 50 alone**, without the upvote ratio.
- **Scryfall is used as planned.** Its domain is on Reddit's global allowlist, so it needs no review.
