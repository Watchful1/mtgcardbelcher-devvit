# MTGCardBelcher

A joke bot for r/magicthecirclejerking and friends. Call a card with `[[double brackets]]` in a comment or post, and it replies with a random joke card image from the curated submissions in r/MTGCardBelcher, plus a link to the real card if one exists.

On r/MTGCardBelcher itself, the app curates submissions: posts move from *new* to *pending* when a moderator approves them, then to *approved* once the community upvotes them, or *rejected* after two weeks.

## App Migration Program

This app replaces the Data API bot u/MTGCardBelcher ([AetheriumSlinky/MTGCardBelcher](https://github.com/AetheriumSlinky/MTGCardBelcher)), a PRAW script. It is published under a temporary name until the app is moved onto the u/MTGCardBelcher account.

## Fetch Domains

| Domain | Why |
|---|---|
| `api.scryfall.com` | Looks up whether each called name is a real Magic card, so the reply can link to the real card's image, and fetches a random flavour text for single-card replies. One `POST /cards/collection` per reply, plus one `GET /cards/random` when a reply names a single card. No user data is sent: only the card names typed in the call. |

## Terms and privacy

- [Terms of Service](docs/legal/terms.md)
- [Privacy Policy](docs/legal/privacy-policy.md)

## Development

```bash
npm install
npm run verify   # type-check, lint, test, build
npm run dev      # playtest
```

See [docs/features.md](docs/features.md) for what the bot does and [docs/migration-plan.md](docs/migration-plan.md) for the port.

## License

GPL-3.0, as the original bot.
