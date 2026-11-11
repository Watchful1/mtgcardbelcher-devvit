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
| `Image pool rebuilt: N images from P pages` | The 30-minute scan of r/MTGCardBelcher finished and replaced the pool. On every install. |
| `Replying to t1_… failed: …` | The reply wasn't posted. The rest of the line says why. |
| `Image pool scan failed, keeping the old pool: …` or `Image pool scan ran out of time…` | See "No joke images" below. |
| `Scryfall … returned 4xx` / `Scryfall … failed` | Replies go out without `[SF]` links or flavour text until Scryfall answers again. |

Comments with no calls, and the app's own comments, are skipped without a log line.

### On r/MTGCardBelcher

| Line | Means |
|---|---|
| `Dry run: would set flair of t3_… from pending to approved` | `curationDryRun` is on, so nothing changed. |
| `Set flair of t3_… from pending to approved` | Curation changed a flair. |
| `Setting flair of t3_… from pending to approved failed: …` | The next scan tries that change again. |
| `The app is not a moderator of r/MTGCardBelcher, so it can't curate flairs` | Curation is stopped until the app account is a moderator there again. The pool scan still runs. |

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

1. **On the replying subreddit's log**, look for the last `Image pool rebuilt` line, or a line saying the scan failed or ran out of time. A failed scan keeps the old pool, so an empty pool means no scan has finished since the install, or the last one found no approved images.
2. **If scans fail:** the rest of the line says why. r/MTGCardBelcher must be public for other subreddits to read it.
3. **If scans run out of time:** the line says after how many pages. The scan has 20 seconds; the playtest read 8 pages, the whole subreddit at the time, well inside that.
4. **If the scan finds 0 images:** check that r/MTGCardBelcher's posts have the *approved* flair. Curation, on r/MTGCardBelcher's install, sets it.
5. **Then rescan:** run **Rebuild MTGCardBelcher image pool** from the replying subreddit's mod menu, instead of waiting for the next 30-minute run.

## Curation

Curation runs every 30 minutes on r/MTGCardBelcher, and only looks at posts from the last 15 days: that's as far back as a post can still change flair.

Every pool follows the flairs as they stand at each scan, at any post age. A moderator setting *approved* or *rejected* by hand, which is how to overrule the score rule, reaches every install within 30 minutes. So does removing, deleting or restoring a post.

**After changing the curation rules,** turn `curationDryRun` on (`npx devvit settings set curationDryRun`), read one run's `Dry run:` lines, then turn it off again.
