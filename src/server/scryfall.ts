// Scryfall: real card images for calls, and a random flavour text. Optional:
// every failure returns "nothing", and the reply is built without it.

// Off if Reddit refuses the api.scryfall.com fetch domain.
export const SCRYFALL_ENABLED = true;

const API = 'https://api.scryfall.com';
const TIMEOUT_MS = 5000;
// Scryfall asks every client to send these.
const HEADERS = { 'User-Agent': 'MTGCardBelcher/2.0', Accept: 'application/json' };

type Fetch = typeof fetch;

interface ImageUris {
  normal?: string;
}

interface Card {
  content_warning?: boolean;
  image_uris?: ImageUris;
  card_faces?: { image_uris?: ImageUris; flavor_text?: string }[];
  flavor_text?: string;
}

/** Image URLs for a card: one per face for double-faced cards, otherwise one. */
export function cardImages(card: Card): string[] {
  if (card.content_warning) return [];
  const faces = card.card_faces?.map((face) => face.image_uris?.normal) ?? [];
  if (faces.length >= 2 && faces.every((url) => url !== undefined)) return faces.slice(0, 2) as string[];
  const single = card.image_uris?.normal;
  return single ? [single] : [];
}

/**
 * Looks up every call by exact card name in one request. Returns lowercased
 * call → image URLs, holding only the calls that are real cards.
 */
export async function lookupCards(calls: string[], fetchFn: Fetch = fetch): Promise<Map<string, string[]>> {
  const found = new Map<string, string[]>();
  const names = [...new Set(calls.map((call) => call.toLowerCase()))];
  if (!SCRYFALL_ENABLED || names.length === 0) return found;

  const response = await request<{ data: Card[]; not_found: { name: string }[] }>(fetchFn, `${API}/cards/collection`, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers: names.map((name) => ({ name: identifierName(name) })) }),
  });
  if (!response) return found;

  // Found cards come back in request order, minus the ones in not_found. Their
  // names can't be matched directly: a double-faced card's name is "Front // Back".
  const missing = new Set(response.not_found.map((id) => id.name.toLowerCase()));
  const cards = [...response.data];
  for (const name of names) {
    if (missing.has(identifierName(name))) continue;
    const card = cards.shift();
    if (!card) break;
    const images = cardImages(card);
    if (images.length > 0) found.set(name, images);
  }
  return found;
}

// The collection endpoint doesn't find "Fire // Ice" by its full name, but
// finds it by its first face, "Fire".
function identifierName(name: string): string {
  return name.split('//')[0]!.trim();
}

/** A random card's flavour text, or undefined. */
export async function randomFlavour(fetchFn: Fetch = fetch): Promise<string | undefined> {
  if (!SCRYFALL_ENABLED) return undefined;
  const card = await request<Card>(fetchFn, `${API}/cards/random?q=has%3Aflavor`, { headers: HEADERS });
  return card?.flavor_text ?? card?.card_faces?.find((face) => face.flavor_text)?.flavor_text;
}

async function request<T>(fetchFn: Fetch, url: string, init: RequestInit): Promise<T | undefined> {
  // The race returns on time even if the transport ignores the abort signal.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), TIMEOUT_MS);
  });
  const call = (async () => {
    try {
      const response = await fetchFn(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) {
        console.warn(`Scryfall ${url} returned ${response.status}`);
        return undefined;
      }
      return (await response.json()) as T;
    } catch (error) {
      console.warn(`Scryfall ${url} failed: ${String(error)}`);
      return undefined;
    }
  })();
  try {
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
