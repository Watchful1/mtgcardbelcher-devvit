# MTGCardBelcher

A joke bot for r/magicthecirclejerking. Call a card with `[[double brackets]]` and it replies with a random joke card from r/MTGCardBelcher, plus a link to the real card if there is one.

## Usage

Put up to 8 card names in double brackets in a comment or post:

```text
[[Lightning Bolt]] is fine, but have you tried [[Grizzly Bears]]?
```

Colossal Dreadmaw, Storm Crow and Negate sometimes win numbered ASCII art.

## Submitting images

Post an image on r/MTGCardBelcher. Once a moderator approves the post, it has two weeks to reach a score of 50 and join the pool.

## Moderators

*Rebuild MTGCardBelcher image pool* in the subreddit menu refreshes the images now instead of at the next 30-minute scan. On r/MTGCardBelcher the app only manages post flairs, and has to be a moderator.

For running or changing the bot, see [development.md](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/development.md).

## App Migration Program

Replaces the Data API bot u/MTGCardBelcher ([AetheriumSlinky/MTGCardBelcher](https://github.com/AetheriumSlinky/MTGCardBelcher)), and runs on the same account.

## Fetch Domains

- `api.scryfall.com`: looks up called card names to link the real card, and gets a random flavour text. Only the card names in a call are sent.

## Terms and privacy

[Terms of Service](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/legal/terms.md), [Privacy Policy](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/docs/legal/privacy-policy.md)

## License

[GPL-3.0](https://github.com/Watchful1/mtgcardbelcher-devvit/blob/main/LICENSE)
