# MTGCardBelcher

A joke bot for r/magicthecirclejerking and friends. Call a card with `[[double brackets]]` and it replies with a random joke card image from r/MTGCardBelcher, plus a link to the real card if there is one.

## Calling cards

Write card names in double brackets in a comment or a post, up to 8 per comment:

```text
[[Lightning Bolt]] is fine, but have you tried [[Grizzly Bears]]?
```

Each name gets a link to a random joke image, and an `[SF]` link to the real card on Scryfall if it exists. A single call also gets a random flavour text.

Some names do more:
- **Colossal Dreadmaw, Storm Crow and Negate** are collectibles. Now and then a call wins the card's ASCII art, numbered with how many have been delivered. Between wins, calls get a "waiting" reply.
- **A few community cards**, such as Rastamon's, get their own image.

## Submitting images

The joke images are posts on r/MTGCardBelcher. A new image post waits for a moderator to approve it, then joins the pool once it reaches a score of 50. Posts that don't get there within two weeks are rejected. Moderators can approve or reject a post at any time by changing its flair.

## Installing it

Moderators can install the app on their subreddit from its page on developers.reddit.com. It then answers calls in new comments and posts there; nothing else needs setting up. The bot skips weekly unjerk threads.

On r/MTGCardBelcher itself, the app answers no calls; it moves image posts through the flairs above. It must be a moderator there to do that.

**Moderator menu:** *Rebuild MTGCardBelcher image pool* (in the subreddit menu) refreshes the joke images straight away, instead of waiting up to 30 minutes.

## More

- [docs/features.md](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/features.md): every reply and rule in detail.
- [docs/operations.md](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/operations.md): reading the logs and fixing problems.
- [docs/development.md](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/development.md): the code, settings, testing and releases.
- [docs/runbooks/handover.md](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/runbooks/handover.md): moving the app onto u/MTGCardBelcher, installing it, and handing the repo to the original bot's owner.
- [docs/migration-plan.md](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/migration-plan.md) and [docs/runbooks/playtest.md](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/runbooks/playtest.md): how the port from the original Python bot, [AetheriumSlinky/MTGCardBelcher](https://github.com/AetheriumSlinky/MTGCardBelcher), was planned and tested.

## App Migration Program

This app replaces the Data API bot u/MTGCardBelcher, a PRAW script. Reddit has moved the app onto the u/MTGCardBelcher account, so it replies under the original bot's name.

## Fetch Domains

| Domain | Why |
|---|---|
| `api.scryfall.com` | Looks up whether each called name is a real Magic card, so the reply can link to the real card's image, and fetches a random flavour text for single-card replies. At most one `POST /cards/collection` and one `GET /cards/random` per reply, with the header `User-Agent: MTGCardBelcher/2.0`. The only user data sent is the card names typed in the call. |

## Terms and privacy

- [Terms of Service](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/legal/terms.md)
- [Privacy Policy](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/legal/privacy-policy.md)

## License

GPL-3.0, as the original bot. See [LICENSE](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/LICENSE).
