# MTGCardBelcher: behaviour

What the app does, rule by rule. Section 5 lists how it differs from the original PRAW bot (v1.3.0, [AetheriumSlinky/MTGCardBelcher](https://github.com/AetheriumSlinky/MTGCardBelcher)).

## 1. Calls

- **Where it listens:** new comments and new posts on every subreddit it's installed on, except r/MTGCardBelcher. Titles and edits are not scanned.
- **What counts as a call:** text in double brackets, `[[name]]`, on one line and at most 150 characters. The escaped form new Reddit's editor writes, `\[\[name\]\]`, also counts.
- **What it skips:**
  - its own items and u/MTGCardFetcher's;
  - comments under a post whose title matches `weekly…unjerk`;
  - posts whose title matches `weekly…unjerk` or `bottom…scoring`;
  - items more than 10 minutes old.
- **Limits:** more than 8 calls in one item gets a "No-one is home… more than 8 queries" reply. A reply that would exceed 2,400 characters is swapped for a "No-one is home… over 2400 characters" reply.

## 2. The normal reply

One line per call, in order:

- `[name](random joke image)`, where the image is picked at random from the image pool (§4).
- If Scryfall has a card with that exact name, ` - ([SF](image))` is added, or ` - ([S](front)[F](back))` for double-faced cards. Cards with a Scryfall content warning get no link.
- If there is exactly one call, a random Scryfall flavour text goes underneath in italics.

Above the lines is a header, and below them the footer `Submit your content at: r/MTGCardBelcher`. Which header is used is drawn from 1,002 equally likely outcomes:

- **1 in 1,002:** a "linkless" reply that has no card lines at all, just one of three canned texts.
- **1 in 1,002:** one of six special headers (Phyrexian oil, Licids, Yargle…).
- **Otherwise:** "The {creature type} have delivered the cards you're looking for", with the creature type picked from 20.

## 3. Special names

Checked in this order:

1. **Collectibles: Colossal Dreadmaw, Storm Crow, Negate** (Negate also matches six spellings with "ae" or "æ", such as "nægate"). Each one has a cooldown: after an art reply, that card's art can't be won again for a random 10 minutes to 2 hours. The cooldown starts open, so the first call after an install gets the art.
   - **When the cooldown has run out**, the whole reply is that card's ASCII art (Negate's is the Desolatormagic copypasta), stamped with a 4-digit collector number: "You are No. 0042 to…". Each install keeps its own count.
   - **While the cooldown is running**, the bot sends a "waiting" reply instead, with a fixed header, one teaser image and a fixed flavour text. No other card in the call gets a line.
2. **Revel in Riches** links to the Negate image instead of a random one.
3. **Rastamonliveup's cards:** 11 custom cards, plus `gal 4:16` / `4:16`, each with alternate spellings. They get the Rastamon header and that card's own image instead of a random one. Kuka Beyo gets a ` :)`, and Sebi Gyandu gets the "Tell the children the truth" flavour text.

## 4. Image pool and curation (r/MTGCardBelcher)

Every 30 minutes each install reads the newest 1,000 posts in r/MTGCardBelcher. The install on r/MTGCardBelcher also moves each post along a flair lifecycle, using mod powers:

| From flair | Condition | To flair |
|---|---|---|
| new | a moderator has approved the post | pending |
| pending | score ≥ 50 | approved |
| pending | older than 2 weeks | rejected |
| no flair | — | other |

The pool is every post with the **approved** flair whose URL is on `i.redd.it` or `i.imgur.com` and that has not been removed, plus one image that is always in it (Jollyver, a tribute to u/MTGLardFetcher). The five flair template IDs are in `src/server/flair-rules.ts`.

## 5. Deliberate changes from the PRAW bot

- **Capitalised collectible names get the waiting reply too.** The PRAW bot compares the text as typed against lowercase spellings, so `[[Colossal Dreadmaw]]` during the cooldown gets a normal reply while `[[colossal dreadmaw]]` gets the waiting one. The port lowercases first, as the art check already does.
- **Each subreddit has its own cooldown and collector numbers.** The PRAW bot shares one cooldown across its subreddits because one process serves them all, and keeps each count in a Reddit comment it edits. The port keeps both in each install's Redis. The counts continue from the PRAW bot's last numbers (Dreadmaw 143, Storm Crow 42, Negate 18), which are the defaults of a moderator setting per card; raising the setting skips the count ahead, for example after a reinstall wipes Redis.
- **It listens wherever it's installed.** There's no list of subreddits: each install answers calls on its own subreddit, except on r/MTGCardBelcher, which only curates.
- **Removed posts leave the pool, and a failed scan keeps the old one.** Like the PRAW bot, every install rebuilds its pool from r/MTGCardBelcher's newest 1,000 posts every 30 minutes. Posts a moderator removed are left out. A scan that fails or runs out of time keeps the previous pool instead of replacing it with part of one.
- **Curation only sets "other" on posts with no flair template**, and logs every change by flair name. Like the PRAW bot, it covers all of the newest 1,000 posts, so it catches up on posts that waited while no bot ran. A setting, `curationDryRun`, makes it log changes without making them.
- **Calls are tidier.** A call can't span lines, is trimmed, and is at most 150 characters; empty calls are ignored. The rich-text editor's escapes inside a call (`Some\_Name`) are removed.
- **Scryfall finds more cards.** The PRAW bot gives no link for card layouts missing from its list, and its lookup misses names containing `&` or `//`. The port uses one rule for images ("`card_faces` images if there are two, otherwise `image_uris`"), looks names up with Scryfall's collection endpoint, and looks split cards up by their first face. Flavour text that sits only on a card's faces is used too.
- **Images are approved on score alone.** The PRAW bot also required an upvote ratio of at least 0.85, which Devvit doesn't expose.
- **No flavour line when Scryfall is down.** The PRAW bot's "Sometimes, rarely, Scryfall is not there…" line is left out.
