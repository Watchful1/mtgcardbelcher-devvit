# Belcher Playtest

The first live test of the MTGCardBelcher Devvit app (`mtgcardbelcher-dev`) on r/mtgcardbelcher_de_dev. You start a playtest, post comments with card calls, and check each reply and log line. At the end, Claude collects the logs and records the results.

Run it from: https://claude.ai/artifact/Qb2qmgR3HUGhFVwRbWftpn

Where:

- **Playtest terminal**: a PowerShell 7 window that runs the playtest. The app's log lines appear here.
- **Second terminal**: another PowerShell 7 window, for one settings command.
- **Reddit**: r/mtgcardbelcher_de_dev in your browser, signed in as yourself, a moderator there.
- **Claude**: this Claude session.

As you go, keep a list of the steps whose result differs from their Expect, and what you saw. You give it to Claude in the last step.

Nothing here touches any subreddit except r/mtgcardbelcher_de_dev. The test posts and counter comments stay there until you remove them. P2 uninstalls the app, which deletes its data on r/mtgcardbelcher_de_dev.

---

## Part 1 — start

- [ ] **1. Start the playtest, and record the commit it tests.** The playtest builds the app, installs it on r/mtgcardbelcher_de_dev and streams its log. Leave this window open until step 15.
  **Where:** Playtest terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && git log -1 --oneline | Tee-Object -FilePath $HOME\belcher-playtest-commit.txt && npx devvit playtest mtgcardbelcher_de_dev
  ```
  **Expect:** the commit line, then within two minutes these two log lines:
  - `App installed to subreddit: r/mtgcardbelcher_de_dev`
  - `Image pool seeded from N pages`, where N is between 1 and 10.

  If the command fails before the log starts, or asks you to log in, run `npx devvit login`, then run this step again. If the log shows `Pool tick failed:`, or nothing after five minutes, note it and go on: step 14 rebuilds the pool.

  **Done 2026-11-08:** the first run targeted r/MTGCardBelcher_dev and failed with "You're not a moderator of r/MTGCardBelcher_dev". The runbook now uses the app's own playtest subreddit, r/mtgcardbelcher_de_dev, which `devvit.json` names as `dev.subreddit`.

## Part 2 — replies

- [ ] **2. Submit the "Belcher playtest" post, with one call in its body.** Open the page in the first block. Put the second block in the title, and the third block in the body.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/submit
  ```
  ```text
  Belcher playtest
  ```
  ```text
  [[Lightning Bolt]]
  ```
  **Expect:** within a minute, u/mtgcardbelcher-dev comments on the post:
  - a first line "The … have delivered the cards you're looking for:";
  - a line "Lightning Bolt - (SF)". Click "Lightning Bolt": it opens an i.redd.it image of a joke card. Click "SF": it opens a cards.scryfall.io image of the real card;
  - one line of flavour text in italics;
  - "Submit your content at: r/MTGCardBelcher" at the end.

  The log shows `Answering t3_… (Lightning Bolt)`.
  - If "(SF)" or the flavour line is missing, look for a `Scryfall … returned` or `Scryfall … failed` line in the log. Note it and go on.
  - If there is no reply, use P3.

  Stay on this post. Steps 3 to 11 comment on it. If you leave it, it is at the top of `https://www.reddit.com/r/mtgcardbelcher_de_dev/new/`.

- [ ] **3. Comment a set of calls in Markdown mode.** Switch the comment box to Markdown mode, and comment this.
  **Where:** Reddit.
  ```text
  [[Delver of Secrets]] [[Fire // Ice]] [[Some Made Up Card]] [[revel in riches]] [[kuka beyo]] [[gal 4:16]] [[sebi gyandu]]
  ```
  **Expect:** within a minute, a reply with these lines, in this order:
  - "Rastamonliveup has delivered the cards you're looking for:"
  - "Delver of Secrets - (SF)", where "S" and "F" are two links
  - "Fire // Ice - (SF)"
  - "Some Made Up Card", with no "(SF)"
  - "revel in riches", linking to `https://i.redd.it/7jkequbnkrzd1.png`
  - "Kuka Beyo :)"
  - "Tell the children the truth", in italics
  - "Sebi Gyandu"
  - "Tell the children the truth", in italics
  - "Submit your content at: r/MTGCardBelcher"

  If a line differs, note it and go on. If there is no reply, use P3.

- [ ] **4. Comment two calls in the rich-text editor.** Switch the comment box from Markdown mode back to the normal editor, and comment this.
  **Where:** Reddit.
  ```text
  [[Llanowar Elves]] [[Counterspell]]
  ```
  **Expect:** within a minute, a reply with the lines "Llanowar Elves - (SF)" and "Counterspell - (SF)", and no flavour line. If there is no reply and no `Answering t1_…` line in the log, the app missed the escaped brackets that the rich-text editor writes. Note it and go on.

- [ ] **5. Comment nine calls in Markdown mode.** Switch the comment box to Markdown mode again, and comment this.
  **Where:** Reddit.
  ```text
  [[a]] [[b]] [[c]] [[d]] [[e]] [[f]] [[g]] [[h]] [[i]]
  ```
  **Expect:** within a minute, a reply with "No-one is home.", "<cue tumbleweed>", "There are more than 8 queries! :(" in italics, and the "Submit your content" line. If it differs, note it and go on. If there is no reply, use P3.

## Part 3 — collectibles

- [ ] **6. Comment Storm Crow, before any collector counter exists.** Without a counter, the app must send the waiting reply.
  **Where:** Reddit.
  ```text
  [[Storm Crow]]
  ```
  **Expect:** within a minute, a reply with "The sky is clear! Not even a single cloud!", a "Storm Crow" link to `https://i.redd.it/ykxjrafd13te1.png`, and "It tells you that the worst is coming. Do you listen?" in italics. If it differs, note it and go on. If there is no reply, use P3.

- [ ] **7. Create the collector counter comments.** On the "Belcher playtest" post, open the post's moderator menu (the shield icon, or the "…" menu), and choose **Create MTGCardBelcher collector counters**. Do this once.
  **Where:** Reddit.
  **Expect:**
  - The toast "Created 3 collector counter comments. Their ids are in the log."
  - Three new comments from u/mtgcardbelcher-dev on the post. Each one is only a number.
  - Three log lines, one of them `Counter comment for Colossal Dreadmaw: t1_… (starts at N). Set it with: npx devvit settings set dreadmawCounterCommentId`.
  - If a log line `Reading the PRAW … counter failed, starting at 0` appears, that counter starts at 0. Go on.
  - If the toast says "Creating the counter comments failed. See the log.", use P3.
  - If you ran this step twice by mistake, use the newest `Colossal Dreadmaw` line in the next steps. The older comments are not used.

- [ ] **8. Start the setting command for the Dreadmaw counter.** It waits for the counter comment's id. Leave it waiting.
  **Where:** Second terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit settings set dreadmawCounterCommentId
  ```
  **Expect:** a prompt for the setting's value. If it says you are not logged in, run `npx devvit login`, then run this step again.

- [ ] **9. Paste the Dreadmaw counter's id into the waiting prompt.** In the Playtest terminal, find the log line that starts `Counter comment for Colossal Dreadmaw:`, and copy the `t1_…` id from it. Paste the id into the prompt in this window, and press Enter.
  **Where:** Second terminal.
  **Expect:** a message that the setting was saved. If the prompt is gone, run step 8 again, then this step. If it shows an error, use P3.

- [ ] **10. Comment Colossal Dreadmaw, to win the art.**
  **Where:** Reddit.
  ```text
  [[Colossal Dreadmaw]]
  ```
  **Expect:**
  - Within a minute, a reply with the Colossal Dreadmaw ASCII card, ending "You are No. XXXX to encounter Colossal Dreadmaw!". XXXX is a four-digit number.
  - After you reload the page, one of the three counter comments shows that same number.
  - The log line `Colossal Dreadmaw art delivered on t1_…`.
  - If the reply is "Colossal Dreadmaw is nowhere to be _seen_." instead, the setting has not reached the app yet. That attempt does not start the cooldown. Wait five minutes, and post the same comment again. If you get the same reply again, use P3.

- [ ] **11. Comment Colossal Dreadmaw again, in capitals.** The art is now on cooldown, so this call must get the waiting reply. Skip this step if step 10 never gave the art.
  **Where:** Reddit.
  ```text
  [[COLOSSAL DREADMAW]]
  ```
  **Expect:** within a minute, a reply with "Colossal Dreadmaw is nowhere to be _seen_.", a "Colossal Dreadmaw" link to `https://i.redd.it/bvjzb0rfaike1.png`, and "You feel the ground quake. Run!" in italics. If it is the ASCII art again, note it and go on.

## Part 4 — ignored threads

- [ ] **12. Submit a "Weekly Unjerk Thread" post, which the app must ignore.** Open the page in the first block. Put the second block in the title, and the third block in the body.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/submit
  ```
  ```text
  Weekly Unjerk Thread
  ```
  ```text
  [[Lightning Bolt]]
  ```
  **Expect:** no reply from u/mtgcardbelcher-dev after a minute, and the log line `Skipping t3_…: excluded-thread`. If the app replies, note it and go on.

- [ ] **13. Comment a call on the "Weekly Unjerk Thread" post.**
  **Where:** Reddit.
  ```text
  [[Lightning Bolt]]
  ```
  **Expect:** no reply after a minute, and the log line `Skipping t1_…: excluded-thread`. If the app replies, note it and go on.

## Part 5 — image pool

- [ ] **14. Rebuild the image pool.** Open the subreddit, open its moderator menu (the shield icon, or the "…" menu), and choose **Rebuild MTGCardBelcher image pool**.
  **Where:** Reddit.
  ```text
  https://www.reddit.com/r/mtgcardbelcher_de_dev/
  ```
  **Expect:** the toast "Rebuilding the image pool. It can take up to half an hour to finish." Then, usually within a minute, the log lines `Image pool reset for a rebuild` and `Image pool seeded from N pages`. Wait for the `seeded` line before step 15. If the log shows `Pool tick skipped: another run holds the lock`, or no `seeded` line comes within five minutes, note it and go on.

## Part 6 — finish

- [ ] **15. Stop the playtest.** Press Ctrl+C.
  **Where:** Playtest terminal.
  **Expect:** the PowerShell prompt returns. The app stays installed on r/mtgcardbelcher_de_dev, and keeps answering calls there.

- [ ] **16. Hand the results to Claude.** Claude reads the last three hours of the app's log, and asks you for your list of steps that differed. Claude records the results in this runbook and in the migration plan, then commits them to `main` and pushes.
  **Where:** Claude.
  ```text
  Ready: do step 16 of the Belcher playtest runbook.
  ```
  **Expect:** Claude reports:
  - the commit that was tested, from `belcher-playtest-commit.txt`;
  - every error line in the log (`failed`, `returned 4xx` or `returned 5xx`);
  - whether Scryfall accepted the app's requests;
  - the answers to the open questions: Scryfall's User-Agent, escaped brackets, and trigger timestamps;
  - the commit with the recorded results.

## If something goes wrong

P1 and P2 apply after any step. P3 applies when a step says "use P3".

- [ ] **P1. Stop the playtest.** Press Ctrl+C.
  **Where:** Playtest terminal.
  **Expect:** the prompt returns. The app stays installed on r/mtgcardbelcher_de_dev. To resume, run step 1 again, then go on from the step you stopped at. The "Belcher playtest" post and the counter comments are still usable.

- [ ] **P2. Uninstall the app from r/mtgcardbelcher_de_dev.** This deletes the app's data and log there. If a failure still needs explaining, do P3 first. Then do P1.
  **Where:** Playtest terminal.
  ```powershell
  cd C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit && npx devvit uninstall mtgcardbelcher_de_dev
  ```
  **Expect:** a message that the app was uninstalled. The test posts and counter comments stay; remove them as a moderator if you want. To start again, redo from step 1.

- [ ] **P3. Hand the failure to Claude.** Claude reads the app's log, asks you which step failed and what you saw, and reports the cause and a fix. If the fix is a code change, Claude makes it, and the running playtest reloads the app by itself.
  **Where:** Claude.
  ```text
  Stuck on the Belcher playtest runbook.
  ```
  **Expect:** Claude reports the log lines that explain the failure, and a fix. Do the fix, then redo the failed step.

## Claude's side

**Step 16 ("Ready"):**
1. Read `$HOME\belcher-playtest-commit.txt` for the commit that was tested.
2. In `C:\Users\greg\Desktop\Projects\mtgcardbelcher-devvit`, run `npx devvit logs mtgcardbelcher_de_dev --since 3h` in the background for about 30 seconds, since it streams, then stop it. Keep the output in the scratchpad.
3. Ask Greg for his list of steps whose result differed, and what he saw.
4. From the log, report: every line containing `failed`, every `Scryfall … returned` line with its status, the `Image pool seeded` lines, the `Counter comment for` lines, and any `Replying to … failed` line.
5. Answer the open questions in `docs/migration-plan.md`:
   - **User-Agent:** Scryfall requests succeeded, or which status they returned.
   - **Escaped brackets:** step 4 got a reply, or it didn't.
   - **Timestamps:** no `Skipping …: too-old` line appeared for a fresh comment.
6. Record the results:
   - a `**Done <date>:**` note under each step that deviated, in `docs/runbooks/playtest.md`;
   - the answers in `docs/migration-plan.md`.

   Re-render the runbook, republish it to its URL, then commit to `main` and push.

**P3 ("Stuck"):**
1. Ask Greg which step failed and what he saw.
2. Run `npx devvit logs mtgcardbelcher_de_dev --since 1h` as in step 16.
3. Find the lines around the failure, read the code they point to, and report the cause and a fix. If the fix is a code change, make it and run `npm run verify`. The running playtest picks it up by itself.
4. Add a `**Done <date>:**` note to the failed step, re-render, and republish.
