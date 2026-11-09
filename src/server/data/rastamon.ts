// u/Rastamonliveup's r/custommagic cards. A call matching one of a card's
// spellings (lowercased) gets the card's own image instead of a joke image,
// and the reply gets the Rastamon header.

export interface RastamonCard {
  name: string;
  spellings: string[];
  image: string;
  /** The link's text, if it isn't the name. */
  linkText?: string;
  /** Text after the link. */
  suffix?: string;
  /** Flavour text for the reply, if the card has its own. */
  flavour?: string;
}

export const RASTAMON_HEADER = "Rastamonliveup has delivered the cards you're looking for:\n\n";

// Without its own flavour, a Rastamon reply ends with a blank line where the
// flavour would go, as the PRAW bot's did. It also stops the Scryfall flavour
// being added.
export const RASTAMON_BLANK_FLAVOUR = '\n';

const SEBI_GYANDU_IMAGE = 'https://i.redd.it/uvqqezzgp4dd1.jpeg';

export const RASTAMON_CARDS: RastamonCard[] = [
  { name: 'Simbaba', spellings: ['simbaba'], image: 'https://i.redd.it/3acfd9iryqjd1.png' },
  { name: 'Japudi', spellings: ['japudi'], image: 'https://i.redd.it/ln92vcaxjnfa1.jpg' },
  { name: 'Kuka Beyo', spellings: ['kuka beyo'], image: 'https://i.redd.it/7tg9y2u7mvfa1.jpg', suffix: ' :)' },
  { name: 'Tōbō Dibi', spellings: ['tobo dibi', 'tōbō dibi'], image: 'https://i.redd.it/his9093feaga1.jpg' },
  { name: 'Bôsgwan', spellings: ['bosgwan', 'bôsgwan'], image: 'https://i.redd.it/b8ti2tcf9wga1.jpg' },
  { name: 'Mwabdi', spellings: ['mwabdi'], image: 'https://i.redd.it/v7tpor93xuha1.jpg' },
  { name: 'Kadÿoba', spellings: ['kadyoba', 'kadÿoba'], image: 'https://i.redd.it/on1zb0bu42ja1.jpg' },
  {
    name: 'Komdegé Swígu',
    spellings: ['komdege swigu', 'komdegé swigu', 'komdege swígu', 'komdegé swígu'],
    image: 'https://i.redd.it/kte28a4yk8ka1.jpg',
  },
  {
    name: 'Dodonbè Dugdjita',
    spellings: ['dodonbe dugdjita', 'dodonbè dugdjita'],
    image: 'https://i.redd.it/p5ywsh4yk8ka1.jpg',
  },
  { name: 'Sembizi Wamdeyo', spellings: ['sembizi wamdeyo'], image: 'https://i.redd.it/q3ybd1udokra1.jpg' },
  {
    name: 'Sebi Gyandu',
    spellings: ['sebi gyandu'],
    image: SEBI_GYANDU_IMAGE,
    flavour: '_Tell the children the truth_\n\n',
  },
  // Galatians 4:16 calls link to Sebi Gyandu, under its flavour text in italics.
  {
    name: 'Galatians 4:16',
    spellings: ['gal 4:16', 'gal. 4:16', 'galatians 4:16', '4:16'],
    image: SEBI_GYANDU_IMAGE,
    linkText: '*Tell the children the truth*',
  },
];

export function findRastamonCard(call: string): RastamonCard | undefined {
  const lower = call.toLowerCase();
  return RASTAMON_CARDS.find((card) => card.spellings.includes(lower));
}
