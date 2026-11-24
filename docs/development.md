# Development

Needs Node 24.

```bash
npm ci
npm run login     # once
npm run verify    # all checks
npm run dev       # playtest on r/MTGCardBelcher_dev
npm run launch    # submit a new version to Reddit
```

Only the app's owner on developers.reddit.com can playtest or launch. Reddit has to approve a new version before it can be installed. Then, as a moderator of each subreddit:

```bash
npx devvit install MTGCardBelcher mtgcardbelcher@latest
npx devvit install magicthecirclejerking mtgcardbelcher@latest
```

## Where things are

- Reply texts: `src/server/data/`, `src/server/reply.ts`
- Custom cards: `src/server/data/rastamon.ts`
- Finding calls, skipped threads: `src/server/calls.ts`
- Flair ids and rules: `src/server/flair-rules.ts`
- Image pool: `src/server/image-pool.ts`
- Devvit wiring: `src/routes/`, `src/server/devvit/`

## Settings

- `curationDryRun`: log flair changes without making them. On by default. Change it with `npx devvit settings set curationDryRun`, entering `true` or `false`.
- Collector numbers: in the app's settings on each subreddit. Reinstalling resets the counts, so set these to the last `art No.` in the log first.

## Logs

```bash
npx devvit logs magicthecirclejerking --since 1h
```

- No `Answering` line: the app never saw a call.
- `Replying to ... failed`: the rest of the line says why. If it's a rate limit, approving the bot's account as a user on the subreddit helps.
- Only Jollyver images: look for `Image pool` errors. r/MTGCardBelcher has to be public.
