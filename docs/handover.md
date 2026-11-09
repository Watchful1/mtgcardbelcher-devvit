# Handover

Moving MTGCardBelcher from its developer, u/Watchful1, to the original bot's owner, u/MustaKotka. Work through it once Reddit has moved the app onto the u/MTGCardBelcher account through the App Migration Program.

## The app

1. **Rename the app in the code.** Reddit gives the moved app a new name (slug). Put it in `name` in `devvit.json` and `package.json`, then run `npm install` to update `package-lock.json`. Until this matches, `devvit logs`, `devvit publish` and `devvit settings` fail with "No installation found".
2. **Give u/MustaKotka access to the app** on developers.reddit.com, so they can publish, read logs and change settings.
3. **Point the collector counters at the original comments.** The app now runs as u/MTGCardBelcher, which wrote them, so it can edit them. Run each, and enter the value shown:
   - `npx devvit settings set dreadmawCounterCommentId`, value `t1_me0tbmp`
   - `npx devvit settings set stormCrowCounterCommentId`, value `t1_mlnqxci`
   - `npx devvit settings set negateCounterCommentId`, value `t1_nn1eyru`
4. **Check `sourceSubreddit` is `MTGCardBelcher`**, in case a test left it pointing at a test subreddit: `npx devvit settings list`. If it isn't, run `npx devvit settings set sourceSubreddit` and enter `MTGCardBelcher`.
5. **Turn curation on** once a run's log on r/MTGCardBelcher shows sensible `Dry run:` lines: `npx devvit settings set curationDryRun`, value off.
6. **Set the dev subreddit.** `dev.subreddit` in `devvit.json` is `mtgcardbelcher_de_dev`, which u/Watchful1 moderates. Either u/Watchful1 makes u/MustaKotka a moderator there, or u/MustaKotka puts a small test subreddit of their own there.
7. **Uninstall the playtest install** from r/mtgcardbelcher_de_dev if it's no longer wanted: `npx devvit uninstall mtgcardbelcher_de_dev`. It still answers calls there.

## The repo

8. **Transfer the GitHub repo** (Settings → Transfer) to AetheriumSlinky, or add them as an admin. Then check that Actions and Dependabot are still on.
9. **Update the operator in the terms and privacy policy** (`docs/legal/`): replace u/Watchful1 with the new operator, and update "Last updated". If the repo's URL changes, update the two links on the app's developer settings page too.
10. **Update the README's App Migration Program section**, which still describes the temporary name.
