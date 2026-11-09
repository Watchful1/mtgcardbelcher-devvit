// Reply text fragments, copied from the PRAW bot's replies.py.

export const FOOTER = '*********\n\nSubmit your content at: r/MTGCardBelcher';

export const CREATURE_TYPES = [
  'Horrors', 'Kobolds', 'Goblins', 'Zombies', 'Vampires', 'Werewolves', 'Legitimate Businesspeople',
  'Brushwaggs', 'Camarids', 'Giants', 'Devils', 'Hydras', 'Krakens', 'Nightmares', 'Dragons',
  'Cyclopes', 'Skeletons', 'Dreadnoughts', 'Wurms', 'Leviathans',
];

export function creatureHeader(creature: string): string {
  return `The ${creature} have delivered the cards you're looking for:\n\n`;
}

export const SPECIAL_HEADERS = [
  "You find the cards you're looking for, but they're covered in that strange oil... It's probably nothing.\n\n",
  "The Licids have imprinted the cards you're looking for into your mind:\n\n",
  "You feel the ground quake. You see the cards you're looking for, but it's too late.\n\n",
  "The Frog Spirit had the cards... But it was hungry and ate them. Worry not, it tells you what they were: 'Gnshhagghkkapphribbit'.\n\n",
  "You! Yes, you! I'm tired of your and your friends' crap. Go fetch. _Throws the cards on the floor:_\n\n",
  'Gruul? Gruul!\n\n',
];

// Whole reply bodies with no card lines.
export const LINKLESS_REPLIES = [
  'The Invasion annihilated the cards you were looking for.\n\nNothing but ashes and pain remain. Somehow you survive.\n\n',
  'Instead of looking for any cards you stop to admire the marvels of nature:\n\n[The Nature Is Wonderful](https://i.redd.it/cwhcrm1b74fd1.png)\n\n',
  'Turns out bottled mail takes forever to arrive...\n\n[You See a Messenger in the Distance](https://i.redd.it/tzcajj1wcjed1.jpeg)\n\n',
];

// Revel in Riches always links to the Negate screenshot.
export const REVEL_IN_RICHES_IMAGE = 'https://i.redd.it/7jkequbnkrzd1.png';
