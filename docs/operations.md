# Operations

Running MTGCardBelcher day to day: reading its log, diagnosing problems, and the limits Reddit puts on it. Run every command here from the repo.

## Reading the log

Each install has its own log. Stream one with:

```bash
npx devvit logs magicthecirclejerking --since 1h
```

Replace `magicthecirclejerking` with the subreddit. Without `--since` it shows only new lines. It keeps streaming until you press Ctrl+C.

### On a subreddit that answers calls

| Line | Means |
|---|---|
| `Answering t1_… (Lightning Bolt, Counterspell)` | A comment or post had calls; the app is replying. |
| `Replied to t1_… as t1_…` | The reply is posted; the second id is the reply. |
| `Colossal Dreadmaw art delivered on t1_… as t1_…` | A collectible's art went out. |
| `Negate art is off: negateCounterCommentId isn't set` | A call could have won the art, but that card has no counter comment set, so it got the waiting reply. Set the setting (see the README's configuration). |
| `Skipping t1_…: too-old` | The trigger arrived more than 10 minutes after the comment, so it wasn't answered. |
| `Skipping t1_…: excluded-thread` | The comment is under a weekly unjerk (or, for posts, bottom-scoring) thread. |
| `Image pool loaded: N images` | The pool was read from r/MTGCardBelcher's wiki page. Every 30 minutes. |
| `Replying to t1_… failed: …` | The reply wasn't posted. The rest of the line says why. |
| `Image pool page couldn't be read; keeping the cached pool` | See "No joke images" below. |
| `Scryfall … returned 4xx` / `Scryfall … failed` | Replies go out without `[SF]` links or flavour text until Scryfall answers again. |

Comments with no calls, and the app's own comments, are skipped without a log line.

### On r/MTGCardBelcher

| Line | Means |
|---|---|
| `Image pool seeded from N pages` | The first run read the newest posts and filled the pool. |
| `Dry run: would set flair of t3_… from pending to approved` | `curationDryRun` is on, so nothing changed. |
| `Set flair of t3_… from pending to approved` | Curation changed a flair. |
| `Image pool page written: N images` | The wiki page was written, because the pool changed or the page had been edited. It isn't written until the first seeding has finished. |
| `The app is not a moderator of r/MTGCardBelcher…` | Curation and the pool are stopped until the app account is a moderator there again. |
| `Pool run failed: …` | The 30-minute run failed; the next one tries again. |

## The bot stopped replying

1. **Look for an `Answering` line** after a test call: `npx devvit logs <subreddit> --since 15m`.
   - **None at all:** check the app is still installed on that subreddit, and that the call is on one line, in double brackets, and under 150 characters.
   - **`Skipping …: too-old`:** Reddit delivered the trigger late. That happens during Reddit outages.
2. **`Answering`, but no `Replied to`:** read the `Replying to … failed` line.
   - **`rate-limited by Reddit until …`:** see "Rate limits" below.
   - **Anything else:** often a deleted or locked parent comment. One failure is normal; many in a row aren't.
3. **`Replied to`, but nobody sees the reply:** a moderator tool such as AutoModerator removed it. Look for the reply id in the subreddit's mod log, and ask the moderators to approve the app account.

## Rate limits

Reddit limits how fast an account can comment, hardest for a new account with little karma in a subreddit.
- **Waits of 10 seconds or less:** the app waits and tries once more (`Rate-limited by Reddit; retrying in … ms`).
- **Longer waits:** the app skips replies until the wait ends, logging `Replying to … failed: rate-limited by Reddit until …` for each.

The fix is for the subreddit's moderators to approve the app account, which lifts the limit there.

## No joke images, only Jollyver

Replies always pick from the pool plus Jollyver. If every joke link is Jollyver (`https://i.redd.it/pcmd6d3o1oad1.png`), the install has no pool:

1. **On the replying subreddit's log**, look for `Image pool loaded` or `Reading r/MTGCardBelcher/wiki/mtgcardbelcher/image-pool failed`.
2. **If the read failed:** open `https://www.reddit.com/r/MTGCardBelcher/wiki/mtgcardbelcher/image-pool`. The page must exist, and r/MTGCardBelcher's wiki must be readable by everyone.
3. **If the page is missing or empty:** check r/MTGCardBelcher's log. The app must be a moderator there, and its first run must have logged `Image pool seeded`.
4. **Then reload:** run **Rebuild MTGCardBelcher image pool** from the replying subreddit's mod menu. It reloads straight away instead of waiting for the next 30-minute run.

## Curation

Curation runs every 30 minutes on r/MTGCardBelcher, and only looks at posts from the last 15 days: that's as far back as a post can still change flair.

When a flair changes for any reason, at any post age, the app updates the pool and the wiki page straight away. That includes a moderator setting *approved* or *rejected* by hand, which is how to overrule the score rule. Removing or deleting a post takes it out of the pool, and approving a removed post puts it back.

The wiki page is the app's: only moderators and approved wiki contributors can edit it, and each 30-minute run rewrites it if its images don't match the pool. Installs only take Reddit and Imgur image links from it.

**After changing the curation rules,** turn `curationDryRun` on (`npx devvit settings set curationDryRun`), read one run's `Dry run:` lines, then turn it off again.
