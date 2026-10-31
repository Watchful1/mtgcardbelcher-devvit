# Playtest checklist

What to check on r/MTGCardBelcher_dev before the app replaces the PRAW bot. Run `npm run dev` from the repo, and watch the log in that terminal.

## Before you start

- **Stop the PRAW bot from replying on the dev subreddit**, or both bots will answer every call.
- **Set up a collector-number comment** if you want to see art replies. Without one, Colossal Dreadmaw, Storm Crow and Negate calls get the "waiting" reply every time.
  1. Post a comment **as the app account** (the app can only edit its own comments), with a number as the whole body, such as `41`.
  2. Point a setting at it: `npx devvit settings set dreadmawCounterCommentId`, then paste the comment id (with or without `t1_`). The others are `stormCrowCounterCommentId` and `negateCounterCommentId`.

## Replies

| Try | Expect |
|---|---|
| A comment with `[[Lightning Bolt]]` | "The {creature} have delivered…", a joke-image link, ` - ([SF](…))`, a flavour line in italics, the footer |
| `[[Delver of Secrets]]` | ` - ([S](…)[F](…))` |
| `[[Fire // Ice]]` | An `[SF]` link |
| `[[Some Made Up Card]]` | A joke link and no Scryfall link |
| Two calls in one comment | Two lines, no flavour line |
| 9 calls | "No-one is home… <cue tumbleweed>" |
| `[[kuka beyo]]`, `[[gal 4:16]]`, `[[sebi gyandu]]` | The Rastamon header; Kuka Beyo with ` :)`; Galatians in italics; Sebi Gyandu with "Tell the children the truth" |
| `[[revel in riches]]` | The Negate screenshot link |
| A self-post with a call in its body | A reply on the post |
| A call typed in the **rich-text** editor (not markdown mode) | A reply. This checks that escaped brackets arrive as `\[\[` |
| A call under a post titled "Weekly Unjerk" | No reply |

## Collectibles (needs the counter comment)

- `[[Colossal Dreadmaw]]`: the ASCII art with the next collector number, and the counter comment goes up by one.
- The same call again: "Colossal Dreadmaw is nowhere to be _seen_." Capitalisation shouldn't matter.

## Image pool

- **After installing**, the log should show `Image pool seeded from N pages`. If it says it ran out of time, a follow-up run should finish within a minute.
- **The joke links** should be images from r/MTGCardBelcher, plus Jollyver.
- **The "Rebuild MTGCardBelcher image pool" menu item** (subreddit menu, moderators) should show a toast and log a new seeding.

## Open questions to answer

- **Upvote ratio:** Devvit's `Post` doesn't expose it, so curation currently approves on **score ≥ 50 alone**. Decide whether that's acceptable.
- **User-Agent:** do Scryfall requests succeed? Any `Scryfall … returned 4xx` line in the log suggests the header is being replaced.
- **Timestamps:** if every reply is skipped as `too-old`, the trigger's `createdAt` unit was misread (`toMs` in `src/routes/triggers.ts`).

## Curation (only on r/MTGCardBelcher)

The dev subreddit doesn't curate, because curation runs only on the r/MTGCardBelcher install and needs the app to be a moderator there with the five flair templates. Test it there, or point `SOURCE_SUBREDDIT` and `FLAIRS` in `src/server/curation.ts` at a test subreddit with its own flair templates.
