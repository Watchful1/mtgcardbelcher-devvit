# Handover

Moving MTGCardBelcher from its developer, u/Watchful1, to the original bot's owner, u/MustaKotka. Work through it once Reddit has moved the app onto the u/MTGCardBelcher account through the App Migration Program.

## The app

1. **Rename the app in the code.** Reddit gives the moved app a new name (slug). Put it in `name` in `devvit.json` and `package.json`, then run `npm install` to update `package-lock.json`. Until this matches, `devvit logs`, `devvit publish` and `devvit settings` fail with "No installation found".
2. **Give u/MustaKotka access to the app** on developers.reddit.com, so they can publish, read logs and change settings.
3. **Point the collector counters at the original comments.** The app now runs as u/MTGCardBelcher, which wrote them, so it can edit them. Run each, and enter the value shown:
   - `npx devvit settings set dreadmawCounterCommentId`, value `t1_me0tbmp`
   - `npx devvit settings set stormCrowCounterCommentId`, value `t1_mlnqxci`
   - `npx devvit settings set negateCounterCommentId`, value `t1_nn1eyru`
4. **Turn curation on** once a run's log on r/MTGCardBelcher shows sensible `Dry run:` lines: `npx devvit settings set curationDryRun`, value off.
5. **Check the dev subreddit.** `dev.subreddit` in `devvit.json` is r/MTGCardBelcher_dev, which u/MustaKotka already moderates, so `npm run dev` works for them as it is.
6. **Uninstall the app from r/mtgcardbelcher_de_dev**, u/Watchful1's old test subreddit: `npx devvit uninstall mtgcardbelcher_de_dev`. It still answers calls there.

## The repo

7. **Transfer the GitHub repo** (Settings → Transfer) to AetheriumSlinky, or add them as an admin. Then check that Actions and Dependabot are still on.
8. **Update the operator in the terms and privacy policy** (`docs/legal/`): replace u/Watchful1 with the new operator, and update "Last updated". If the repo's URL changes, update the two links on the app's developer settings page too.
9. **Update the README's App Migration Program section**, which still describes the temporary name.
