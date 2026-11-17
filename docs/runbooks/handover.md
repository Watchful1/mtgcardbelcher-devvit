# Belcher Handover

Installs MTGCardBelcher on its subreddits now that it runs as u/MTGCardBelcher, and hands the repo to the original bot's owner, u/MustaKotka. The app is already migrated and the PRAW bot is stopped, so nothing replies to calls until the install in Part 3.

Each install can be done in one of two ways, and the install steps give both:
- **You install it**, if you are a moderator of that subreddit with full ("Everything") permissions.
- **Someone else installs it**: you send u/MustaKotka a message, and they, or a moderator they ask, install it from the app's page. This needs step 4.

Run it from: https://claude.ai/artifact/KR7york4UVWvPEfsPx3gwB

Where:

- **Claude**: this Claude session.
- **Browser**: your browser, signed in to Reddit as yourself.
- **Terminal**: a PowerShell 7 window on your PC.
- **Logs**: a second PowerShell 7 window on your PC, streaming r/MTGCardBelcher's log.
- **Chat**: a Reddit chat with u/MustaKotka.

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

  **Done 2026-11-17:** the migration renamed the app to `mtgcardbelcher` (shown as MTGCardBelcher); the code is renamed. `npx devvit logs` works under the new name. `npx devvit settings list` fails with `GetAppSettingsFields NOT_FOUND: app compute context was not found`, so step 7 and P2 can't change `curationDryRun` until that's fixed.

- [ ] **2. Check that the app's newest version is approved.** The installs use the newest approved version, so it must hold the code you want to run. The command opens the app's page: open the version picker under "App permissions".
  **Where:** Terminal, then Browser.
  ```powershell
  Start-Process (Get-Content $HOME\belcher-app-url.txt)
  ```
  **Expect:** the highest version number in the picker is approved.
  - If the highest version is still in review, wait for the approval, then do this step again.
  - If the repo has commits that you haven't launched, run the command below, wait for the approval, then do this step again. It records the launched commit in `$HOME\belcher-launch-commit.txt`.

  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && git log -1 --oneline | Tee-Object -FilePath $HOME\belcher-launch-commit.txt && npm run launch
  ```

- [ ] **3. Note where you can install the app yourself.** For r/MTGCardBelcher and r/magicthecirclejerking, check whether you are a moderator with full ("Everything") permissions. Open each moderator list from the blocks.
  **Where:** Browser.
  ```text
  https://www.reddit.com/r/MTGCardBelcher/about/moderators
  ```
  ```text
  https://www.reddit.com/r/magicthecirclejerking/about/moderators
  ```
  **Expect:** you know, for each of the two, whether you install it or u/MustaKotka arranges it. If you install both, skip step 4.

- [ ] **4. Ask Reddit to let other moderators install the app.** Only moderators of allowlisted subreddits can install an unlisted app, and the allowlist ("Public Limited" mode) is turned on by request to r/Devvit modmail. Open the link in the first block, and send the message in the second.
  **Where:** Browser.
  ```text
  https://www.reddit.com/message/compose?to=r/Devvit
  ```
  ```text
  Hi! Please turn on Public Limited mode for my unlisted app, the App Migration Program port of u/MTGCardBelcher, and allow r/MTGCardBelcher and r/magicthecirclejerking. Their moderators need to install it themselves. Thanks!
  ```
  **Expect:** the message is sent. Go on with the runbook. When you reach an install that someone else does, wait there until r/Devvit answers. Then run the command in the third block, which opens the app's developer settings. If the page lists allowed subreddits and the two aren't there, add the names in the fourth block, one per line, and save. The docs for this mode are in the last block.
  ```powershell
  Start-Process "$(Get-Content $HOME\belcher-app-url.txt)/developer-settings"
  ```
  ```text
  MTGCardBelcher
  magicthecirclejerking
  ```
  ```text
  https://developers.reddit.com/docs/guides/launch/launch-guide#share-an-unlisted-app-with-selected-communities
  ```

## Part 2 — r/MTGCardBelcher

- [ ] **5. Stream r/MTGCardBelcher's log.** Leave this window open until step 11.
  **Where:** Logs.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit logs MTGCardBelcher
  ```
  **Expect:** the log starts streaming. A message that there is no installation yet is fine until step 6.

- [ ] **6. Install the app on r/MTGCardBelcher.** There, the app curates image flairs and answers no calls. Curation starts in dry run: it logs the flair changes it would make, and makes none.
  - **If you install it,** run the first block.
  - **If u/MustaKotka arranges it,** run the second block. It copies a message to your clipboard: paste it into the Chat, and wait for their answer.

  **Where:** Terminal, then Chat.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit install MTGCardBelcher
  ```
  ```powershell
  "Hi! The new MTGCardBelcher app is ready. Could you install it on r/MTGCardBelcher? Open $(Get-Content $HOME\belcher-app-url.txt), click Install, and choose r/MTGCardBelcher. Tell me when it's done." | Set-Clipboard
  ```
  **Expect:** within a minute of the install, the Logs window shows:
  - `App installed to subreddit: r/MTGCardBelcher`;
  - `Image pool rebuilt: N images from P pages`, with N over 500;
  - zero or more `Dry run: would set flair of t3_… from … to …` lines.

  If it shows `Set flair of` lines instead of `Dry run:` ones, dry run is off: use P2 now, then P1. If it shows `The app is not a moderator of r/MTGCardBelcher`, or a line with `failed`, use P1.

- [ ] **7. Check the dry-run lines, then turn curation on.** Each `Dry run:` line from step 6 must move a post from `new` to `pending`, from `pending` to `approved` or `rejected`, or from `no flair` to `other`. If any line moves a post another way, stop and use P1. Otherwise run the command. It asks whether dry run is on: choose false (No), and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set curationDryRun
  ```
  **Expect:** a message that the setting was saved.
  - If step 6 showed `Dry run:` lines, wait up to 30 minutes: the Logs window then shows a `Set flair of t3_… from … to …` line for each of them.
  - If step 6 showed none, there is nothing to change yet. Go on.
  - If a line shows `Setting flair of … failed`, use P1.

## Part 3 — r/magicthecirclejerking

- [ ] **8. Install the app on r/magicthecirclejerking.**
  - **If you install it,** run the first block.
  - **If u/MustaKotka arranges it,** run the second block. Paste the message into the Chat, and wait for their answer.

  **Where:** Terminal, then Chat.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit install magicthecirclejerking
  ```
  ```powershell
  "Hi! Could you install the new MTGCardBelcher app on r/magicthecirclejerking, or ask a moderator there with full ('Everything') permissions to? Open $(Get-Content $HOME\belcher-app-url.txt), click Install, and choose r/magicthecirclejerking. Tell me when it's done." | Set-Clipboard
  ```
  **Expect:** a message that the app was installed, or u/MustaKotka's answer that it's done. If the install fails, use P1.

- [ ] **9. Comment a call on r/magicthecirclejerking.** Comment the text in the second block on any recent post, such as a daily thread.
  **Where:** Browser.
  ```text
  https://www.reddit.com/r/magicthecirclejerking/new/
  ```
  ```text
  [[Lightning Bolt]]
  ```
  **Expect:** within a minute, a reply from **u/MTGCardBelcher** with `Lightning Bolt` as a link. If the reply is from another account, or no reply comes within two minutes, use P1.

## Part 4 — tidy up

- [ ] **10. Uninstall the app from r/mtgcardbelcher_de_dev,** your old test subreddit. Its stored data, the replied-to list and cooldowns, goes with it; nothing there is needed.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit uninstall mtgcardbelcher_de_dev
  ```
  **Expect:** a message that the app was uninstalled, or that it isn't installed there. Either is fine.

- [ ] **11. Stop the log stream.** Press Ctrl+C.
  **Where:** Logs.
  **Expect:** the PowerShell prompt returns.

- [ ] **12. Hand the results to Claude.** Claude reads the last three hours of the logs on r/MTGCardBelcher and r/magicthecirclejerking, and asks you for the steps whose result differed from their Expect. Claude records the results in this runbook and in the docs, then commits and pushes them.
  **Where:** Claude.
  ```text
  Ready: do step 12 of the Belcher handover runbook.
  ```
  **Expect:** Claude reports:
  - the `Image pool rebuilt` line and the curation lines from r/MTGCardBelcher;
  - every line containing `failed` or `not a moderator`, on either subreddit, and what each means;
  - the commit with the recorded results.

  If Claude reports a failure, use P1 for it.

## Part 5 — the repo (can wait)

- [ ] **13. Hand the repo's handover edits to Claude.** Claude asks you for the GitHub account the repo goes to and the Reddit username of whoever runs the app from now on. Claude names them in the terms and privacy policy, points the README's links at the new repo address, commits and pushes, and saves the two new policy addresses for step 16.
  **Where:** Claude.
  ```text
  Ready: do step 13 of the Belcher handover runbook.
  ```
  **Expect:** Claude reports the commit and the two new addresses.

- [ ] **14. POINT OF NO RETURN: transfer the GitHub repo.** Open the repo's settings, scroll to "Danger Zone", click **Transfer**, and enter the account from step 13 and the repo name `mtgcardbelcher-devvit`. Only the new owner can transfer it back.
  **Where:** Browser.
  ```text
  https://github.com/Watchful1/mtgcardbelcher-devvit/settings
  ```
  **Expect:** GitHub says the transfer is pending until the new owner accepts.

- [ ] **15. Wait for the new owner to accept the transfer.** Ask them in the Chat if they haven't seen GitHub's email.
  **Where:** Chat.
  **Expect:** the old address redirects to the new owner's repo. Until it does, don't do step 16: the new policy addresses don't exist yet.
  ```text
  https://github.com/Watchful1/mtgcardbelcher-devvit
  ```

- [ ] **16. Update the terms and privacy links on the app's developer settings page.** The command prints the two new addresses and opens the page. Replace the terms link with the first address and the privacy link with the second, and save.
  **Where:** Terminal, then Browser.
  ```powershell
  Get-Content $HOME\belcher-legal-urls.txt; Start-Process "$(Get-Content $HOME\belcher-app-url.txt)/developer-settings"
  ```
  **Expect:** the page saves the two links, and each opens its document on the new owner's GitHub.

- [ ] **17. Give u/MustaKotka access to the app.** On the developer settings page from step 16, look for a way to add another developer or collaborator, and add u/MustaKotka, so they can publish, read logs and change settings.
  **Where:** Browser.
  **Expect:** u/MustaKotka is listed. If the page has no such option, send the message in the first block to r/Devvit modmail, from the link in the second block. Their answer says how to give access or transfer the app.
  ```text
  Hi! I ported u/MTGCardBelcher to Devvit through the App Migration Program, and I'm handing it to its original owner, u/MustaKotka. How can I give them access to the app, or transfer it to them?
  ```
  ```text
  https://www.reddit.com/message/compose?to=r/Devvit
  ```

## If something goes wrong

P1 applies at any step. P2 applies after step 6. P3 applies after steps 6 and 8.

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

- [ ] **P3. Uninstall the app from a subreddit where it misbehaves.** If you installed it there, run the block for that subreddit. If someone else did, send u/MustaKotka the last block in the Chat.
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

**Step 12 ("Ready"):**
1. In the repo, run `npx devvit logs <subreddit> --since 3h` for MTGCardBelcher and magicthecirclejerking, each in the background for about 30 seconds, since they stream, then stop them. Keep the output in the scratchpad.
2. Ask Greg for the steps whose result differed from their Expect, and what he saw.
3. Report the `Image pool rebuilt`, `Dry run:` and `Set flair of` lines from r/MTGCardBelcher, and every line containing `failed` or `not a moderator`, with what each means (docs/operations.md).
4. Record the results: a `**Done <date>:**` note under each step that deviated, in `docs/runbooks/handover.md`; and the migration plan's status line. Re-render the runbook, republish it to its URL, then commit and push.

**Step 13 ("Ready"):**
1. Ask Greg for the GitHub account the repo goes to, and the Reddit username of the new operator.
2. In `docs/legal/terms.md` and `docs/legal/privacy-policy.md`, replace u/Watchful1 as operator with the new one, and update "Last updated".
3. In `README.md`, replace `https://github.com/Watchful1/mtgcardbelcher-devvit` with the new owner's address in every link.
4. Run `npm run verify`, commit and push.
5. Write the two new addresses, `https://github.com/<owner>/mtgcardbelcher-devvit/blob/main/docs/legal/terms.md` and the same for `privacy-policy.md`, one per line, to `$HOME\belcher-legal-urls.txt`.
6. Report the commit and the two addresses.

**P1 ("Stuck"):**
1. Ask Greg which step went wrong and what he saw.
2. Read the log of the subreddit involved, as in step 12, for the last hour.
3. Find the lines around the problem, read the code they point to, and report the cause, a fix, and the step to resume from. If the fix is a code change, make it, run `npm run verify`, and commit; push only while the repo is still Greg's (before step 14), otherwise give the change to the new owner. Tell Greg it needs `npm run launch` and Reddit's approval before the installs pick it up.
4. Add a `**Done <date>:**` note to the step, re-render, and republish.
