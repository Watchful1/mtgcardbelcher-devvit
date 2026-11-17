# Belcher Handover

Installs MTGCardBelcher on its subreddits now that it runs as u/MTGCardBelcher, and hands the repo to the original bot's owner, u/MustaKotka. The app is already migrated and the PRAW bot is stopped, so nothing replies to calls until the install in Part 3. You do every install yourself, as a temporary moderator.

Run it from: https://claude.ai/artifact/KR7york4UVWvPEfsPx3gwB

Where:

- **Claude**: this Claude session.
- **Chat**: a Reddit chat with u/MustaKotka.
- **Logs**: a second PowerShell 7 window on your PC, streaming r/MTGCardBelcher's log.
- **Terminal**: a PowerShell 7 window on your PC.
- **Browser**: your browser, signed in to Reddit as yourself.

Nothing in Parts 1 to 4 is irreversible: P3 uninstalls the app from a subreddit. You can stop after any step and resume at the next unticked one another day. Part 5 can wait.

---

## Part 1 — before installing

- [ ] **1. Hand the app's address to Claude.** Claude asks you for the address of the app's page on developers.reddit.com. If the migration changed the app's name, Claude puts the new name in the code, runs the checks, and commits and pushes it. Claude saves the address for later steps and checks that the command line reaches the app.
  **Where:** Claude.
  ```text
  Ready: do step 1 of the Belcher handover runbook.
  ```
  **Expect:** Claude reports:
  - the app's name, and whether it changed;
  - the commit, if it changed;
  - that `npx devvit settings list` lists the app's settings.

  If Claude reports a problem, stop and solve it with Claude before you go on.

  **Done 2026-11-17:** the migration renamed the app to `mtgcardbelcher` (shown as MTGCardBelcher), and the code is renamed. `npx devvit settings list` failed with `app compute context was not found` until the first `npm run launch` under the new name; it works since.

- [ ] **2. Ask u/MustaKotka to make you a temporary moderator.** Only a moderator with full permissions can install the app. Send the message below, and wait for their answer.
  **Where:** Chat.
  ```text
  Hi! The new MTGCardBelcher bot is ready to switch on. To install it I need to be a moderator with full permissions on r/MTGCardBelcher and r/magicthecirclejerking for a day. Could you add me on both, or ask the r/magicthecirclejerking mods to? I'll step down as soon as it's done.
  ```
  **Expect:** a moderator invite with full ("Everything") permissions on each subreddit, in your Reddit inbox. Accept both.

## Part 2 — r/MTGCardBelcher

- [ ] **3. Stream r/MTGCardBelcher's log.** Leave this window open until step 9.
  **Where:** Logs.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit logs MTGCardBelcher
  ```
  **Expect:** the log starts streaming. A message that there is no installation yet is fine until step 4.

- [ ] **4. Install the app on r/MTGCardBelcher.** There, the app curates image flairs and answers no calls. Curation starts in dry run: it logs the flair changes it would make, and makes none.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit install MTGCardBelcher
  ```
  **Expect:** a message that the app was installed, naming your newest version. If it names an older one, Reddit hasn't approved your last launch yet: use P3 for r/MTGCardBelcher, wait for the approval, then do this step again. Within a minute of the install, the Logs window shows:
  - `App installed to subreddit: r/MTGCardBelcher`;
  - `Image pool rebuilt: N images from P pages`, with N over 500;
  - zero or more `Dry run: would set flair of t3_… from … to …` lines.

  If it shows `Set flair of` lines instead of `Dry run:` ones, dry run is off: use P2 now, then P1. If it shows `The app is not a moderator of r/MTGCardBelcher`, or a line with `failed`, use P1.

- [ ] **5. Check the dry-run lines, then turn curation on.** Each `Dry run:` line from step 4 must move a post from `new` to `pending`, from `pending` to `approved` or `rejected`, or from `no flair` to `other`. If any line moves a post another way, stop and use P1. Otherwise run the command. It asks whether dry run is on: choose false (No), and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set curationDryRun
  ```
  **Expect:** a message that the setting was saved.
  - If step 4 showed `Dry run:` lines, wait up to 30 minutes: the Logs window then shows a `Set flair of t3_… from … to …` line for each of them.
  - If step 4 showed none, there is nothing to change yet. Go on.
  - If a line shows `Setting flair of … failed`, use P1.

## Part 3 — r/magicthecirclejerking

- [ ] **6. Install the app on r/magicthecirclejerking.**
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit install magicthecirclejerking
  ```
  **Expect:** a message that the app was installed, naming the same version as step 4. If the install fails, use P1.

- [ ] **7. Comment a call on r/magicthecirclejerking.** Comment the text in the second block on any recent post, such as a daily thread.
  **Where:** Browser.
  ```text
  https://www.reddit.com/r/magicthecirclejerking/new/
  ```
  ```text
  [[Lightning Bolt]]
  ```
  **Expect:** within a minute, a reply from **u/MTGCardBelcher** with `Lightning Bolt` as a link. If the reply is from another account, or no reply comes within two minutes, use P1.

## Part 4 — tidy up

- [ ] **8. Uninstall the app from r/mtgcardbelcher_de_dev,** your old test subreddit. Its stored data, the replied-to list and cooldowns, goes with it; nothing there is needed.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit uninstall mtgcardbelcher_de_dev
  ```
  **Expect:** a message that the app was uninstalled, or that it isn't installed there. Either is fine.

- [ ] **9. Stop the log stream.** Press Ctrl+C.
  **Where:** Logs.
  **Expect:** the PowerShell prompt returns.

- [ ] **10. Step down as a moderator on both subreddits.** On each moderator page, click **Leave as mod**. The app stays installed.
  **Where:** Browser.
  ```text
  https://www.reddit.com/r/MTGCardBelcher/about/moderators
  ```
  ```text
  https://www.reddit.com/r/magicthecirclejerking/about/moderators
  ```
  **Expect:** you are no longer listed on either. Later uninstalls go through u/MustaKotka, as P3 says.

- [ ] **11. Hand the results to Claude.** Claude reads the last three hours of the logs on r/MTGCardBelcher and r/magicthecirclejerking, and asks you for the steps whose result differed from their Expect. Claude records the results in this runbook and in the docs, then commits and pushes them.
  **Where:** Claude.
  ```text
  Ready: do step 11 of the Belcher handover runbook.
  ```
  **Expect:** Claude reports:
  - the `Image pool rebuilt` line and the curation lines from r/MTGCardBelcher;
  - every line containing `failed` or `not a moderator`, on either subreddit, and what each means;
  - the commit with the recorded results.

  If Claude reports a failure, use P1 for it.

## Part 5 — the repo (can wait)

- [ ] **12. Hand the repo's handover edits to Claude.** Claude asks you for the GitHub account the repo goes to and the Reddit username of whoever runs the app from now on. Claude names them in the terms and privacy policy, points the README's links at the new repo address, commits and pushes, and saves the two new policy addresses for step 15.
  **Where:** Claude.
  ```text
  Ready: do step 12 of the Belcher handover runbook.
  ```
  **Expect:** Claude reports the commit and the two new addresses.

- [ ] **13. POINT OF NO RETURN: transfer the GitHub repo.** Open the repo's settings, scroll to "Danger Zone", click **Transfer**, and enter the account from step 12 and the repo name `mtgcardbelcher-devvit`. Only the new owner can transfer it back.
  **Where:** Browser.
  ```text
  https://github.com/Watchful1/mtgcardbelcher-devvit/settings
  ```
  **Expect:** GitHub says the transfer is pending until the new owner accepts.

- [ ] **14. Wait for the new owner to accept the transfer.** Ask them in the Chat if they haven't seen GitHub's email.
  **Where:** Chat.
  **Expect:** the old address redirects to the new owner's repo. Until it does, don't do step 15: the new policy addresses don't exist yet.
  ```text
  https://github.com/Watchful1/mtgcardbelcher-devvit
  ```

- [ ] **15. Update the terms and privacy links on the app's developer settings page.** The command prints the two new addresses and opens the page. Replace the terms link with the first address and the privacy link with the second, and save.
  **Where:** Terminal, then Browser.
  ```powershell
  Get-Content $HOME\belcher-legal-urls.txt; Start-Process "$(Get-Content $HOME\belcher-app-url.txt)/developer-settings"
  ```
  **Expect:** the page saves the two links, and each opens its document on the new owner's GitHub.

- [ ] **16. Give u/MustaKotka access to the app.** On the developer settings page from step 15, look for a way to add another developer or collaborator, and add u/MustaKotka, so they can publish, read logs and change settings.
  **Where:** Browser.
  **Expect:** u/MustaKotka is listed. If the page has no such option, send the message in the first block to r/Devvit modmail, from the link in the second block. Their answer says how to give access or transfer the app.
  ```text
  Hi! I ported u/MTGCardBelcher to Devvit through the App Migration Program, and I'm handing it to its original owner, u/MustaKotka. How can I give them access to the app, or transfer it to them?
  ```
  ```text
  https://www.reddit.com/message/compose?to=r/Devvit
  ```

## If something goes wrong

P1 applies at any step. P2 applies after step 4. P3 applies after steps 4 and 6.

- [ ] **P1. Hand the problem to Claude.** Claude asks which step went wrong and what you saw, reads that subreddit's log, and reports the cause and a fix.
  **Where:** Claude.
  ```text
  Stuck on the Belcher handover runbook.
  ```
  **Expect:** Claude reports the log lines that explain the problem, a fix, and the step to resume from. If the fix is a code change, it reaches the installs only after `npm run launch` and Reddit's approval: until then, stop at the step that failed.

- [ ] **P2. Turn curation back to dry run.** Use this if curation changes flairs it shouldn't. The command asks whether dry run is on: choose true (Yes), and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set curationDryRun
  ```
  **Expect:** a message that the setting was saved. Flairs already changed stay as they are; moderators can set them back by hand.

- [ ] **P3. Uninstall the app from a subreddit where it misbehaves.** While you are a moderator there, run the block for that subreddit. After step 10, send u/MustaKotka the last block in the Chat instead.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit uninstall MTGCardBelcher
  ```
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit uninstall magicthecirclejerking
  ```
  ```text
  The new MTGCardBelcher app is misbehaving, sorry! Could you uninstall it for now? In the subreddit's mod tools, open Installed apps, choose MTGCardBelcher, and click Uninstall. I'll tell you when it's fixed.
  ```
  **Expect:** a message that the app was uninstalled, or u/MustaKotka's answer. The app stops replying there. Then use P1. To try again later, redo that subreddit's install step.

## Claude's side

**Step 1 ("Ready"):**
1. Ask Greg for the address of the app's page on developers.reddit.com, as shown in the address bar (it starts `https://developers.reddit.com/apps/`).
2. Take the app name from the address. If it differs from `name` in `devvit.json`, put it in `name` in `devvit.json` and `package.json`, run `npm install`, then `npm run verify`, and commit and push.
3. Write the address, without a trailing slash or anything after the app name, to `$HOME\belcher-app-url.txt` with `Set-Content`, and read it back.
4. Run `npx devvit settings list` in the repo, with about a 30-second timeout, and check that it lists `curationDryRun`.
5. Report the name, whether it changed, the commit, and the settings check.

**Step 11 ("Ready"):**
1. In the repo, run `npx devvit logs <subreddit> --since 3h` for MTGCardBelcher and magicthecirclejerking, each in the background for about 30 seconds, since they stream, then stop them. Keep the output in the scratchpad.
2. Ask Greg for the steps whose result differed from their Expect, and what he saw.
3. Report the `Image pool rebuilt`, `Dry run:` and `Set flair of` lines from r/MTGCardBelcher, and every line containing `failed` or `not a moderator`, with what each means (docs/operations.md).
4. Record the results: a `**Done <date>:**` note under each step that deviated, in `docs/runbooks/handover.md`; and the migration plan's status line. Re-render the runbook, republish it to its URL, then commit and push.

**Step 12 ("Ready"):**
1. Ask Greg for the GitHub account the repo goes to, and the Reddit username of the new operator.
2. In `docs/legal/terms.md` and `docs/legal/privacy-policy.md`, replace u/Watchful1 as operator with the new one, and update "Last updated".
3. In `README.md`, replace `https://github.com/Watchful1/mtgcardbelcher-devvit` with the new owner's address in every link.
4. Run `npm run verify`, commit and push.
5. Write the two new addresses, `https://github.com/<owner>/mtgcardbelcher-devvit/blob/main/docs/legal/terms.md` and the same for `privacy-policy.md`, one per line, to `$HOME\belcher-legal-urls.txt`.
6. Report the commit and the two addresses.

**P1 ("Stuck"):**
1. Ask Greg which step went wrong and what he saw.
2. Read the log of the subreddit involved, as in step 11, for the last hour.
3. Find the lines around the problem, read the code they point to, and report the cause, a fix, and the step to resume from. If the fix is a code change, make it, run `npm run verify`, and commit; push only while the repo is still Greg's (before step 13), otherwise give the change to the new owner. Tell Greg it needs `npm run launch` and Reddit's approval before the installs pick it up.
4. Add a `**Done <date>:**` note to the step, re-render, and republish.
