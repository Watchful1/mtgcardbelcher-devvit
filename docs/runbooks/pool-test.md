# Belcher Pool Test

Tests the shared image pool end to end, with r/mtgcardbelcher_de_dev standing in for r/MTGCardBelcher. You give r/mtgcardbelcher_de_dev the five post flairs and two image posts, point the app at it with the `sourceSubreddit` setting, and update the app's install there to the current code. Then you check:
- the app writes the pool to r/mtgcardbelcher_de_dev's wiki;
- the playtest on r/MTGCardBelcher_dev reads that page from the other subreddit;
- changing a flair, removing a post and approving it again each update the page.

Run it from: https://claude.ai/artifact/EgpHWhcEhf5HsSc2zXJ6G6

Where:

- **Terminal**: a PowerShell 7 window for one-off commands.
- **Logs terminal**: a second PowerShell 7 window that streams r/mtgcardbelcher_de_dev's log.
- **Playtest terminal**: a third PowerShell 7 window that runs the playtest on r/MTGCardBelcher_dev and shows its log.
- **Reddit**: your browser, signed in as yourself.
- **Claude**: this Claude session.

As you go, note any step whose result differs from its Expect. You give the list to Claude in the last step.

Nothing here is irreversible, and nothing touches r/MTGCardBelcher. Two things to know:
- While `sourceSubreddit` names r/mtgcardbelcher_de_dev, every install of the app reads its images from there, and the app doesn't answer calls on r/mtgcardbelcher_de_dev. Step 19 sets it back, and P1 does the same if you stop early. The app isn't installed on any real subreddit yet, so nothing else is affected meanwhile.
- The original PRAW bot, u/MTGCardBelcher, also answers calls on r/MTGCardBelcher_dev. If it's running, your test comments there get a reply from each bot. Only the app's reply (from u/mtgcardbelcher-dev) counts.

---

## Part 1 — the source subreddit

- [ ] **1. Add the five post flairs to r/mtgcardbelcher_de_dev.** Add five link flair templates, with exactly this text: `New`, `Pending`, `Approved`, `Rejected`, `Other`.
  **Where:** Reddit.
  ```text
  https://old.reddit.com/r/mtgcardbelcher_de_dev/about/flair/#link_templates
  ```
  **Expect:** the five templates are listed under "link flair templates", spelled and capitalised exactly as above.

- [ ] **2. Let everyone read the wiki.** Under "wiki", choose "mod editing": everyone can read the wiki, and only moderators can edit it. Then click **save options** at the bottom. If the subreddit is private or restricted to approved users, set it to **public** on the same page, so the app can read its wiki from another subreddit.
  **Where:** Reddit.
  ```text
  https://old.reddit.com/r/mtgcardbelcher_de_dev/about/edit/
  ```
  **Expect:** the page says your changes were saved.

- [ ] **3. Submit image post "Pool test A" with the Approved flair.** Upload any image, use the title below, and choose the flair **Approved**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/submit
  ```
  ```text
  Pool test A
  ```
  **Expect:** the post shows the image and the flair "Approved".

- [ ] **4. Submit image post "Pool test B" with the Pending flair.** Upload a different image, use the title below, and choose the flair **Pending**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/submit
  ```
  ```text
  Pool test B
  ```
  **Expect:** the post shows the image and the flair "Pending".

## Part 2 — make it the source

- [ ] **5. Point the app at r/mtgcardbelcher_de_dev.** The command asks for the setting's value: type the value in the second block, and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set sourceSubreddit
  ```
  ```text
  mtgcardbelcher_de_dev
  ```
  **Expect:** a message that the setting was saved. If it says you are not logged in, run `npx devvit login`, then this step again.

- [ ] **6. Upload the current code as a new version, and record the commit.**
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && git log -1 --oneline | Tee-Object -FilePath $HOME\belcher-pool-test-commit.txt && npx devvit upload
  ```
  **Expect:** the commit line, then a line saying which version was uploaded. Write that version down for step 7. If the upload fails, use P3.

- [ ] **7. Update the app's install on r/mtgcardbelcher_de_dev to that version.**
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit install mtgcardbelcher_de_dev mtgcardbelcher-dev
  ```
  **Expect:** a message that the app was installed or updated, naming the version from step 6. If it names an older version, stop and use P3.

- [ ] **8. Stream r/mtgcardbelcher_de_dev's log.** Leave this window open until step 21.
  **Where:** Logs terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit logs mtgcardbelcher_de_dev --since 15m
  ```
  **Expect:** the log starts streaming. If it says `The app is not a moderator of r/mtgcardbelcher_de_dev`, stop and use P3.

- [ ] **9. Build the pool on r/mtgcardbelcher_de_dev.** Open the subreddit's moderator menu (the shield icon, or the "…" menu), and choose **Rebuild MTGCardBelcher image pool**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/
  ```
  **Expect:** the toast "Rebuilding the image pool from the newest 1,000 posts. It can take up to half an hour to finish." Within a minute, these lines appear in the Logs terminal:
  - `Image pool reset for a rebuild`
  - `Image pool seeded from 1 pages`
  - `Image pool page written: 1 images`

  Lines starting `Dry run: would set flair of` are fine: they are the playtest's old posts, which curation would flair "Other", and dry run stops it.

  - If the menu item isn't there, use P3.
  - If the toast says "The image pool has 0 images from r/MTGCardBelcher", or the three lines don't all appear, the setting from step 5 may not have reached the app yet. Wait five minutes, then do this step again. If it happens a second time, use P3.
  - If a line starting `Pool run failed:` appears, use P3.

- [ ] **10. Check the wiki page.** It holds one image link.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/wiki/mtgcardbelcher/image-pool
  ```
  **Expect:** a first line starting "# MTGCardBelcher image pool.", then one `https://i.redd.it/…` line. That link opens Pool test A's image. If the page doesn't exist, use P3.

- [ ] **11. Check the page's permissions.**
  **Where:** Reddit.
  ```text
  https://old.reddit.com/r/mtgcardbelcher_de_dev/wiki/settings/mtgcardbelcher/image-pool
  ```
  **Expect:** "only approved wiki contributors for this page may edit" is selected, and "listed" is not ticked. If they differ, note it and go on.

## Part 3 — another subreddit reads the page

- [ ] **12. Make a post for test comments on r/MTGCardBelcher_dev.** Use the title below, with no body.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/MTGCardBelcher_dev/submit
  ```
  ```text
  Belcher pool test
  ```
  **Expect:** the post exists.

- [ ] **13. Start the playtest on r/MTGCardBelcher_dev.** The playtest only changes the app on r/MTGCardBelcher_dev; the install on r/mtgcardbelcher_de_dev keeps running. Leave this window open until step 20.
  **Where:** Playtest terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit playtest
  ```
  **Expect:** the log starts streaming. If it asks you to log in, run `npx devvit login`, then this step again.

- [ ] **14. Reload the pool on r/MTGCardBelcher_dev.** Open the subreddit's moderator menu, and choose **Rebuild MTGCardBelcher image pool**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/MTGCardBelcher_dev/
  ```
  **Expect:** the toast "The image pool has 1 images from r/mtgcardbelcher_de_dev. The log says if the reload failed.", and the Playtest terminal shows `Image pool loaded: 1 images`.

  - If the menu item isn't there, use P3.
  - If the toast says 0 images and the log shows `Reading r/mtgcardbelcher_de_dev/wiki/mtgcardbelcher/image-pool failed:`, the app can't read another subreddit's wiki. That is the main result of this test, and Claude reads the line from the log in step 22. Skip steps 15 to 18, and go on with step 19.

- [ ] **15. Comment six calls on the "Belcher pool test" post.**
  **Where:** Reddit.
  ```text
  [[a]] [[b]] [[c]] [[d]] [[e]] [[f]]
  ```
  **Expect:** within a minute, a reply from u/mtgcardbelcher-dev with six card lines. At least one of the links opens Pool test A's image; the others open Jollyver (`https://i.redd.it/pcmd6d3o1oad1.png`). If every link opens Jollyver, comment the same text again: the chance of that twice is 1 in 4,096. If it happens again, note it and go on.

## Part 4 — the triggers keep the page current

- [ ] **16. Change Pool test B's flair to Approved.** Open Pool test B from the subreddit's new posts, and set its flair to **Approved**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/new/
  ```
  **Expect:** within a minute, the Logs terminal shows `Image pool page written: 2 images`. If nothing appears, note it and go on.

- [ ] **17. Remove Pool test A.** Open Pool test A from the subreddit's new posts, and use **Remove** from its moderator menu.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/new/
  ```
  **Expect:** within a minute, the Logs terminal shows `Image pool page written: 1 images`, or `0 images` if step 16 didn't update the page. If nothing appears, note it and go on.

- [ ] **18. Approve Pool test A again.** Open Pool test A from the subreddit's new posts, and use **Approve** from its moderator menu.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/new/
  ```
  **Expect:** within a minute, the Logs terminal shows `Image pool page written: 2 images` (`1 images` if step 16 didn't update the page). The wiki page from step 10 then holds the same number of links. If not, note it and go on.

## Part 5 — clean up

- [ ] **19. Point the app back at r/MTGCardBelcher.** The command asks for the setting's value: type the value in the second block, and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set sourceSubreddit
  ```
  ```text
  MTGCardBelcher
  ```
  **Expect:** a message that the setting was saved. The app answers calls on r/mtgcardbelcher_de_dev again.

- [ ] **20. Stop the playtest.** Press Ctrl+C.
  **Where:** Playtest terminal.
  **Expect:** the PowerShell prompt returns.

- [ ] **21. Stop the log stream.** Press Ctrl+C.
  **Where:** Logs terminal.
  **Expect:** the PowerShell prompt returns. The flairs, posts and wiki page on r/mtgcardbelcher_de_dev stay, for a later test.

- [ ] **22. Hand the results to Claude.** Claude reads both subreddits' logs from the last two hours, and asks you for your list of steps that differed. Claude records the results in this runbook and in docs/operations.md, then commits and pushes them.
  **Where:** Claude.
  ```text
  Ready: do step 22 of the Belcher pool test runbook.
  ```
  **Expect:** Claude reports:
  - the commit that was tested;
  - whether the app wrote the page, set its permissions, and read it from r/MTGCardBelcher_dev;
  - whether each of steps 16 to 18 updated the page;
  - every error line in either log;
  - the commit with the recorded results.

## If something goes wrong

P1 applies after step 5, whenever you stop before step 19. P2 applies when a step says "use P2".

- [ ] **P1. Point the app back at r/MTGCardBelcher.** Do this before you stop for good. The command asks for the setting's value: type the value in the second block, and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set sourceSubreddit
  ```
  ```text
  MTGCardBelcher
  ```
  **Expect:** a message that the setting was saved. Then stop any playtest or log stream still running with Ctrl+C. To start again later, redo from step 5.

- [ ] **P2. Hand the failure to Claude.** Claude reads the logs, asks you which step failed and what you saw, and reports the cause and a fix.
  **Where:** Claude.
  ```text
  Stuck on the Belcher pool test runbook.
  ```
  **Expect:** Claude reports the lines that explain the failure, and a fix. Do the fix, then redo the failed step.

## Claude's side

**Step 22 ("Ready"):**
1. Read `$HOME\belcher-pool-test-commit.txt` for the commit that was tested.
2. In the repo, run `npx devvit logs mtgcardbelcher_de_dev --since 2h` and `npx devvit logs MTGCardBelcher_dev --since 2h`, each in the background for about 30 seconds, since they stream, then stop them. Keep the output in the scratchpad.
3. Ask Greg for his list of steps whose result differed, and what he saw.
4. From the logs, report: the `Image pool seeded`, `Image pool page written` and `Image pool loaded` lines with their counts; any `Reading r/… failed` line; any line containing `failed` or `not a moderator`.
5. Record the results:
   - a `**Done <date>:**` note under each step that deviated, in `docs/runbooks/pool-test.md`;
   - what was proven (cross-subreddit wiki read, page permissions, triggers) in the "Curation" and "No joke images" sections of `docs/operations.md`.

   Re-render the runbook, republish it to its URL, then commit and push.

**P2 ("Stuck"):**
1. Ask Greg which step failed and what he saw.
2. Read the logs as in step 22, for the last hour.
3. Find the lines around the failure, read the code they point to, and report the cause and a fix. If the fix is a code change, make it, run `npm run verify`, commit and push, and tell Greg to redo step 6 (upload), step 7 (install) and then the failed step. A running playtest picks up the change by itself.
4. Add a `**Done <date>:**` note to the failed step, re-render, and republish.
