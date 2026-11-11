# MTGCardBelcher: behaviour

What the bot does, rule by rule. Sections 1 to 4 describe the original PRAW bot (v1.3.0, `AetheriumSlinky/MTGCardBelcher@db7d020`), and source references are to that repo; the Devvit app does the same, except for the deliberate changes listed in section 5.

## 1. Calls

- **Where it listens:** new comments and new self-posts in r/magicthecirclejerking, r/edhcirclejerk and r/MTGCardBelcher_dev, a list in the PRAW bot's config. Post bodies are scanned; post titles are not.
- **What counts as a call:** text in double brackets, `[[name]]`. The escaped form new Reddit's editor writes, `\[\[name\]\]`, also counts (`text_functions.py:get_regex_bracket_matches`).
- **What it skips:**
  - its own items and u/MTGCardFetcher's;
  - comments under a post whose title matches `weekly…unjerk`;
  - posts whose title matches `weekly…unjerk` or `bottom…scoring`;
  - items more than 10 minutes old (a guard against Reddit replaying old items).
- **Limits:** more than 8 calls in one item gets a "No-one is home… more than 8 queries" reply. A reply that would exceed 2,400 characters is swapped for a "No-one is home… over 2400 characters" reply.

## 2. The normal reply

One line per call, in order:

- `[name](random joke image)`, where the image is picked at random from the image pool (§4).
- If Scryfall has a card with that exact name, ` - ([SF](image))` is added, or ` - ([S](front)[F](back))` for double-faced cards. Cards with a Scryfall content warning get no link.
- If there is exactly one call, a random Scryfall flavour text goes underneath in italics. In the PRAW bot, a fixed joke line goes there if Scryfall is down.

Above the lines is a header, and below them the footer `Submit your content at: r/MTGCardBelcher`. Which header is used is drawn from 1,002 equally likely outcomes:

- **1 in 1,002:** a "linkless" reply that has no card lines at all, just one of three canned texts (`replies.py:ReplyLinklessTexts`).
- **1 in 1,002:** one of six special headers (Phyrexian oil, Licids, Yargle…).
- **Otherwise:** "The {creature type} have delivered the cards you're looking for", with the creature type picked from 20.

## 3. Special names

Checked in this order:

1. **Collectibles: Colossal Dreadmaw, Storm Crow, Negate** (Negate also matches six spellings with "ae" or "æ", such as "nægate"). Each one has a cooldown: after an art reply, that card's art can't be won again for a random 10 minutes to 2 hours. The cooldown starts open, so the first call after the bot starts gets the art.
   - **When the cooldown has run out**, the whole reply is that card's ASCII art (Negate's is the Desolatormagic copypasta), stamped with a 4-digit collector number: "You are No. 0042 to…". The running count is stored as the body of a Reddit comment the bot edits (`me0tbmp`, `mlnqxci`, `nn1eyru`).
   - **While the cooldown is running**, the bot sends a "waiting" reply instead, with a fixed header, one teaser image and a fixed flavour text. No other card in the call gets a line.
2. **Revel in Riches** links to the Negate image instead of a random one.
3. **Rastamonliveup's cards:** 11 custom cards, plus `gal 4:16` / `4:16`, each with alternate spellings. They get the Rastamon header and that card's own image instead of a random one. Kuka Beyo gets a ` :)`, and Sebi Gyandu gets the "Tell the children the truth" flavour text.

## 4. Image pool and curation (r/MTGCardBelcher)

Every 30 minutes the bot reads the newest 1,000 posts in r/MTGCardBelcher and moves each one along a flair lifecycle using mod powers:

| From flair | Condition | To flair |
|---|---|---|
| new | a moderator has approved the post | pending |
| pending | score ≥ 50 **and** upvote ratio ≥ 0.85 (the port: score alone, see §5) | approved |
| pending | older than 2 weeks | rejected |
| (any) | a field is missing, such as the post having no flair | other, and the bot logs it for a person to look at |

The pool is every post with the **approved** flair whose URL is on `i.redd.it` or `i.imgur.com` and is not a self-post, plus one image that is always in it (Jollyver, a tribute to u/MTGLardFetcher). The five flair template IDs are in `configs.py:IMGSubmissionParams`.

## 5. Deliberate changes from the PRAW bot

- **Capitalised collectible names get the waiting reply too.** The PRAW bot compares the text as typed against lowercase spellings (`text_functions.py:988`), so `[[Colossal Dreadmaw]]` during the cooldown gets a normal reply while `[[colossal dreadmaw]]` gets the waiting one. The port lowercases first, as the art check already does.
- **Each subreddit has its own cooldown.** The PRAW bot shares one cooldown across all three subreddits because one process serves them all. The collector numbers stay shared.
- **It listens wherever it's installed.** There's no list of subreddits: each install answers calls on its own subreddit, except on r/MTGCardBelcher, which only curates.
- **Removed posts leave the pool, and a failed scan keeps the old one.** Like the PRAW bot, every install rebuilds its pool from r/MTGCardBelcher's newest 1,000 posts every 30 minutes. Posts a moderator removed are left out. A scan that fails or runs out of time keeps the previous pool instead of replacing it with part of one.
- **Curation only looks at the last 15 days of posts**, as far back as a flair can still change, and only sets "other" on posts with no flair template; it logs every change by flair name. A setting, `curationDryRun`, makes it log changes without making them.
- **Calls are tidier.** A call can't span lines, is trimmed, and is at most 150 characters; empty calls are ignored. The rich-text editor's escapes inside a call (`Some\_Name`) are removed.
- **Scryfall finds more cards.** The PRAW bot gives no link for card layouts missing from its list, and its lookup misses names containing `&` or `//`. The port uses one rule for images ("`card_faces` images if there are two, otherwise `image_uris`"), looks names up with Scryfall's collection endpoint, and looks split cards up by their first face. Flavour text that sits only on a card's faces is used too.
- **Images are approved on score alone.** The PRAW bot also required an upvote ratio of at least 0.85, which Devvit doesn't expose.
- **No flavour line when Scryfall is down.** The PRAW bot's "Sometimes, rarely, Scryfall is not there…" line is left out.
- **A collectible with no counter comment set up gets the waiting reply.** The collector number lives in a Reddit comment named by a setting; until it is set, the art can't be numbered, so calls get the waiting reply instead.

## Not ported (PRAW plumbing)

Stream polling, reconnect loops, the OAuth file, rotating log files and the custom `CONFIRMATION` log level. Devvit's triggers, scheduler and `devvit logs` take their place. The port does retry a comment once when Reddit rate-limits it briefly (see [operations.md](operations.md#rate-limits)).
