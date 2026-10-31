# MTGCardBelcher: features to port

What the PRAW bot (v1.3.0, `AetheriumSlinky/MTGCardBelcher@db7d020`) does, written as behaviour the Devvit app must reproduce. Source references are to that repo.

## 1. Calls

- **Where it listens:** new comments and new self-posts in r/magicthecirclejerking, r/edhcirclejerk and r/MTGCardBelcher_dev. Post bodies are scanned; post titles are not.
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
- If there is exactly one call, a random Scryfall flavour text goes underneath in italics. If Scryfall is down, a fixed joke line goes there instead.

Above the lines is a header, and below them the footer `Submit your content at: r/MTGCardBelcher`. Which header is used is drawn from 1,002 equally likely outcomes:

- **1 in 1,002:** a "linkless" reply that has no card lines at all, just one of three canned texts (`replies.py:ReplyLinklessTexts`).
- **1 in 1,002:** one of six special headers (Phyrexian oil, Licids, Yargle…).
- **Otherwise:** "The {creature type} have delivered the cards you're looking for", with the creature type picked from 20.

## 3. Special names

Checked in this order:

1. **Collectibles: Colossal Dreadmaw, Storm Crow, Negate** (Negate also matches six "æ" misspellings). Each one has a cooldown: after an art reply, that card's art can't be won again for a random 10 minutes to 2 hours. The cooldown starts open, so the first call after the bot starts gets the art.
   - **When the cooldown has run out**, the whole reply is that card's ASCII art (Negate's is the Desolatormagic copypasta), stamped with a 4-digit collector number: "You are No. 0042 to…". The running count is stored as the body of a Reddit comment the bot edits (`me0tbmp`, `mlnqxci`, `nn1eyru`).
   - **While the cooldown is running**, the bot sends a "waiting" reply instead, with a fixed header, one teaser image and a fixed flavour text. No other card in the call gets a line.
2. **Revel in Riches** links to the Negate image instead of a random one.
3. **Rastamonliveup's cards:** 11 custom cards, plus `gal 4:16` / `4:16`, each with alternate spellings. They get the Rastamon header and that card's own image instead of a random one. Kuka Beyo gets a ` :)`, and Sebi Gyandu gets the "Tell the children the truth" flavour text.

## 4. Image pool and curation (r/MTGCardBelcher)

Every 30 minutes the bot reads the newest 1,000 posts in r/MTGCardBelcher and moves each one along a flair lifecycle using mod powers:

| From flair | Condition | To flair |
|---|---|---|
| new | a moderator has approved the post | pending |
| pending | score ≥ 50 **and** upvote ratio ≥ 0.85 | approved |
| pending | older than 2 weeks | rejected |
| (any) | a field is missing | other, and the bot logs it for a person to look at |

The pool is every post with the **approved** flair whose URL is on `i.redd.it` or `i.imgur.com` and is not a self-post, plus one image that is always in it (Jollyver, a tribute to u/MTGLardFetcher). The five flair template IDs are in `configs.py:IMGSubmissionParams`.

## 5. Deliberate changes from the PRAW bot

- **Capitalised collectible names get the waiting reply too.** The PRAW bot compares the text as typed against lowercase spellings (`text_functions.py:988`), so `[[Colossal Dreadmaw]]` during the cooldown gets a normal reply while `[[colossal dreadmaw]]` gets the waiting one. The port lowercases first, as the art check already does.
- **Each subreddit has its own cooldown.** The PRAW bot shares one cooldown across all three subreddits because one process serves them all. The collector numbers stay shared.
- **The image pool is kept, not rebuilt.** The PRAW bot rebuilds the pool from the newest 1,000 posts every 30 minutes. The port stores the pool in Redis and only reads recent posts (see the plan).
- **Scryfall layouts the bot doesn't recognise** get no Scryfall link. A simpler rule ("use `card_faces` images if they exist, otherwise `image_uris`") covers every layout and would drop that list.

## Not ported (PRAW plumbing)

Stream polling, reconnect and retry loops, the OAuth file, rotating log files and the custom `CONFIRMATION` log level. Devvit's triggers, scheduler and `devvit logs` take their place.
