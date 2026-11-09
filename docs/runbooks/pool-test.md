# Belcher Pool Test

Tests the shared image pool end to end, with a test subreddit standing in for r/MTGCardBelcher. You make r/belcher_pool_test, with the five post flairs and two image posts. You point the app at it with the `sourceSubreddit` setting and install the app there as the source. Then you check:
- the app writes the pool to the test subreddit's wiki;
- the playtest on r/mtgcardbelcher_de_dev reads that page from the other subreddit;
- changing a flair, removing a post and approving it again each update the page.

Where:

- **Terminal**: a PowerShell 7 window for one-off commands.
- **Logs terminal**: a second PowerShell 7 window that streams r/belcher_pool_test's log.
- **Playtest terminal**: a third PowerShell 7 window that runs the playtest on r/mtgcardbelcher_de_dev and shows its log.
- **Reddit**: your browser, signed in as yourself.
- **Claude**: this Claude session.

As you go, note any step whose result differs from its Expect. You give the list to Claude in the last step.

Nothing here is irreversible, and nothing touches r/MTGCardBelcher. One thing must not be forgotten: while `sourceSubreddit` names the test subreddit, every install of the app reads its images from there. Step 19 sets it back, and P1 does the same if you stop early.

---

## Part 1 — the test subreddit

- [ ] **1. Create the subreddit r/belcher_pool_test.** Make it public, so the app can read its wiki from another subreddit.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/subreddits/create
  ```
  **Expect:** r/belcher_pool_test exists and you are its moderator. If the name is taken, stop and tell Claude the name you used instead; Claude updates this runbook.

- [ ] **2. Add the five post flairs.** Add five link flair templates, with exactly this text: `New`, `Pending`, `Approved`, `Rejected`, `Other`.
  **Where:** Reddit.
  ```text
  https://old.reddit.com/r/belcher_pool_test/about/flair/#link_templates
  ```
  **Expect:** the five templates are listed under "link flair templates".

- [ ] **3. Let everyone read the wiki.** Under "wiki", choose "mod editing", then click **save options** at the bottom.
  **Where:** Reddit.
  ```text
  https://old.reddit.com/r/belcher_pool_test/about/edit/
  ```
  **Expect:** the page says your changes were saved.

- [ ] **4. Submit image post "Pool test A" with the Approved flair.** Upload any image, use the title below, and choose the flair **Approved**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/belcher_pool_test/submit
  ```
  ```text
  Pool test A
  ```
  **Expect:** the post shows the image and the flair "Approved".

- [ ] **5. Submit image post "Pool test B" with the Pending flair.** Upload a different image, use the title below, and choose the flair **Pending**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/belcher_pool_test/submit
  ```
  ```text
  Pool test B
  ```
  **Expect:** the post shows the image and the flair "Pending".

## Part 2 — install the app as the source

- [ ] **6. Point the app at the test subreddit.** The command asks for the setting's value. Type `belcher_pool_test` and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set sourceSubreddit
  ```
  **Expect:** a message that the setting was saved. If it says you are not logged in, run `npx devvit login`, then this step again.

- [ ] **7. Upload the current code as a new version, and record the commit.**
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && git log -1 --oneline | Tee-Object -FilePath $HOME\belcher-pool-test-commit.txt && npx devvit upload
  ```
  **Expect:** the commit line, then a line saying which version was uploaded. Note that version. If the upload fails, stop and use P3.

- [ ] **8. Install the app on r/belcher_pool_test.**
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit install belcher_pool_test mtgcardbelcher-dev
  ```
  **Expect:** a message that the app was installed, naming the version from step 7. If it names an older version, stop and use P3.

- [ ] **9. Stream the test subreddit's log.** Leave this window open until step 20.
  **Where:** Logs terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit logs belcher_pool_test --since 15m
  ```
  **Expect:** the line `App installed to subreddit: r/belcher_pool_test`. If the log also says `The app is not a moderator of r/belcher_pool_test`, stop and use P3.

- [ ] **10. Build the pool on the test subreddit.** On r/belcher_pool_test, open the subreddit's moderator menu (the shield icon, or the "…" menu), and choose **Rebuild MTGCardBelcher image pool**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/belcher_pool_test/
  ```
  **Expect:** the toast "Rebuilding the image pool from the newest 1,000 posts. It can take up to half an hour to finish." Within a minute, these lines appear in the Logs terminal:
  - `Image pool reset for a rebuild`
  - `Image pool seeded from 1 pages`
  - `Image pool page written: 1 images`

  If the toast says "The image pool has 0 images from r/MTGCardBelcher", the setting from step 6 hasn't reached the app yet. Wait five minutes, then do this step again. If a line starting `Pool run failed:` appears, stop and use P3.

- [ ] **11. Check the wiki page.** It holds one image link.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/belcher_pool_test/wiki/mtgcardbelcher/image-pool
  ```
  **Expect:** a first line starting "# MTGCardBelcher image pool.", then one `https://i.redd.it/…` line. That link opens Pool test A's image. If the page doesn't exist, use P3.

- [ ] **12. Check the page's permissions.**
  **Where:** Reddit.
  ```text
  https://old.reddit.com/r/belcher_pool_test/wiki/settings/mtgcardbelcher/image-pool
  ```
  **Expect:** "only approved wiki contributors for this page may edit" is selected, and "listed" is not ticked. If they differ, note it and go on.

## Part 3 — another subreddit reads the page

- [ ] **13. Start the playtest on r/mtgcardbelcher_de_dev.** Leave this window open until step 20.
  **Where:** Playtest terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit playtest mtgcardbelcher_de_dev
  ```
  **Expect:** the log starts streaming. If it asks you to log in, run `npx devvit login`, then this step again.

- [ ] **14. Reload the pool on r/mtgcardbelcher_de_dev.** Open the subreddit's moderator menu, and choose **Rebuild MTGCardBelcher image pool**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/
  ```
  **Expect:** the toast "The image pool has 1 images from r/belcher_pool_test. The log says if the reload failed.", and the Playtest terminal shows `Image pool loaded: 1 images`.

  If the toast says 0 images and the log shows `Reading r/belcher_pool_test/wiki/mtgcardbelcher/image-pool failed:`, the app can't read another subreddit's wiki. That is the main result of this test: copy the whole line into your notes, then go on to step 19.

- [ ] **15. Comment six calls on r/mtgcardbelcher_de_dev.** Use any post there, for example "Belcher playtest" at the top of the subreddit's new posts.
  **Where:** Reddit.
  ```text
  [[a]] [[b]] [[c]] [[d]] [[e]] [[f]]
  ```
  **Expect:** within a minute, a reply with six card lines. At least one of the links opens Pool test A's image; the others open Jollyver (`https://i.redd.it/pcmd6d3o1oad1.png`). If every link opens Jollyver, comment the same text again: the chance of that twice is 1 in 4,096. If it happens again, note it and go on.

## Part 4 — the triggers keep the page current

- [ ] **16. Change Pool test B's flair to Approved.** On r/belcher_pool_test, open Pool test B, and set its flair to **Approved**.
  **Where:** Reddit.
  **Expect:** within a minute, the Logs terminal shows `Image pool page written: 2 images`. If nothing appears, note it and go on.

- [ ] **17. Remove Pool test A.** Open Pool test A, and use **Remove** from its moderator menu.
  **Where:** Reddit.
  **Expect:** within a minute, the Logs terminal shows `Image pool page written: 1 images`. If nothing appears, note it and go on.

- [ ] **18. Approve Pool test A again.** Open Pool test A, and use **Approve** from its moderator menu.
  **Where:** Reddit.
  **Expect:** within a minute, the Logs terminal shows `Image pool page written: 2 images`. Reload the wiki page from step 11: it holds two links. If not, note it and go on.

## Part 5 — clean up

- [ ] **19. Point the app back at r/MTGCardBelcher.** The command asks for the setting's value. Type `MTGCardBelcher` and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set sourceSubreddit
  ```
  **Expect:** a message that the setting was saved.

- [ ] **20. Stop the playtest.** Press Ctrl+C. Then press Ctrl+C in the Logs terminal too.
  **Where:** Playtest terminal.
  **Expect:** both windows return to the PowerShell prompt.

- [ ] **21. Uninstall the app from r/belcher_pool_test.** The subreddit and its posts stay, for a later test.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit uninstall belcher_pool_test
  ```
  **Expect:** a message that the app was uninstalled.

- [ ] **22. Hand the results to Claude.** Claude reads both subreddits' logs from the last two hours, and asks you for your list of steps that differed. Claude records the results in this runbook and in docs/operations.md, then commits and pushes them.
  **Where:** Claude.
  ```text
  Ready: do step 22 of the Belcher pool test runbook.
  ```
  **Expect:** Claude reports:
  - the commit that was tested;
  - whether the app wrote the page, set its permissions, and read it from r/mtgcardbelcher_de_dev;
  - whether each of steps 16 to 18 updated the page;
  - every error line in either log;
  - the commit with the recorded results.

## If something goes wrong

P1 applies after step 6, whenever you stop before step 19. P2 applies after step 8. P3 applies when a step says "use P3".

- [ ] **P1. Point the app back at r/MTGCardBelcher.** Do this before you stop for good. The command asks for the setting's value. Type `MTGCardBelcher` and press Enter.
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set sourceSubreddit
  ```
  **Expect:** a message that the setting was saved. To start again later, redo from step 6.

- [ ] **P2. Uninstall the app from r/belcher_pool_test.**
  **Where:** Terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit uninstall belcher_pool_test
  ```
  **Expect:** a message that the app was uninstalled. To start again, redo from step 8.

- [ ] **P3. Hand the failure to Claude.** Claude reads the logs, asks you which step failed and what you saw, and reports the cause and a fix.
  **Where:** Claude.
  ```text
  Stuck on the Belcher pool test runbook.
  ```
  **Expect:** Claude reports the lines that explain the failure, and a fix. Do the fix, then redo the failed step.

## Claude's side

**Step 22 ("Ready"):**
1. Read `$HOME\belcher-pool-test-commit.txt` for the commit that was tested.
2. In the repo, run `npx devvit logs belcher_pool_test --since 2h` and `npx devvit logs mtgcardbelcher_de_dev --since 2h`, each in the background for about 30 seconds, since they stream, then stop them. Keep the output in the scratchpad.
3. Ask Greg for his list of steps whose result differed, and what he saw.
4. From the logs, report: the `Image pool seeded`, `Image pool page written` and `Image pool loaded` lines with their counts; any `Reading r/… failed` line; any line containing `failed` or `not a moderator`.
5. Record the results:
   - a `**Done <date>:**` note under each step that deviated, in `docs/runbooks/pool-test.md`;
   - what was proven (cross-subreddit wiki read, page permissions, triggers) in the "Curation" and "No joke images" sections of `docs/operations.md`.

   Re-render the runbook, republish it to its URL, then commit and push.

**P3 ("Stuck"):**
1. Ask Greg which step failed and what he saw.
2. Read the logs as in step 22, for the last hour.
3. Find the lines around the failure, read the code they point to, and report the cause and a fix. If the fix is a code change, make it, run `npm run verify`, commit and push, and tell Greg to redo step 7 (upload), step 8 (install) and then the failed step. A running playtest picks up the change by itself.
4. Add a `**Done <date>:**` note to the failed step, re-render, and republish.
