// All copy lives here so the team can edit text without touching scene code.
// [VERIFY] = check before demo. [QUOTE NEEDED] = replace with a real,
// permission-given quote from someone with lived experience. Never invent quotes.

export type RoomId =
  | 'colourBlindness'
  | 'tunnelVision'
  | 'dyslexia'
  | 'faceBlindness'
  | 'tinnitus'
  | 'schizophrenia'
  | 'reflection';

export interface RoomInfo {
  id: RoomId;
  title: string;
  icon: string;
  accent: string; // Okabe-Ito: distinguishable for colour-blind visitors
  tagline: string;
  quote: string;
  quoteBy: string;
  stat: string; // shown on the intro card as "Why it matters"
  source: string; // optional; shown only when set
  task: string;
  supportTask: string;
  warning?: string;
  note?: string;
  helped: string;
  action: string; // shown in the reflection room
}

export const ROOMS: RoomInfo[] = [
  {
    id: 'colourBlindness',
    title: 'Colour blindness',
    icon: '🎨',
    accent: '#E69F00',
    tagline: 'When red and green look the same',
    quote: "In my line of work, colour-coding is crucial for spotting errors. I've adapted, but sometimes I feel I'm missing the full experience of visual design and art.",
    quoteBy: '— John',
    stat: 'So much of the world uses colour alone for safety, directions and information. A difference in how you see colour becomes an everyday barrier to independence.',
    source: '',
    task: 'Pick 5 ripe (red) tomatoes and drop them in your basket.',
    supportTask: 'Same task, now with ripeness tags on the produce.',
    helped: 'Labels and symbols carried the meaning, not colour alone.',
    action: 'Add labels or symbols. Never use colour alone.',
  },
  {
    id: 'tunnelVision',
    title: 'Tunnel vision',
    icon: '👁️',
    accent: '#56B4E9',
    tagline: 'Seeing the world through a keyhole',
    quote: "You might see a person's face clearly, but completely miss the hand they're waving at you from the side.",
    quoteBy: '— How people with peripheral vision loss often describe it',
    stat: "With only a narrow window of sight, a familiar place hides its hazards. A step, a moving bike or a friend waving stays invisible until it's right in front of you.",
    source: '',
    task: 'Find your keys somewhere in this living room.',
    supportTask: 'Same task, with a tidy room, a high-contrast key tag and a sound cue.',
    helped: 'A tidy, predictable space, high contrast and a sound cue.',
    action: 'Greet people from the front, and say hello out loud.',
  },
  {
    id: 'dyslexia',
    title: 'Dyslexia',
    icon: '📖',
    accent: '#009E73',
    tagline: 'When reading takes everything you have',
    quote: "When I was a kid they didn't call it dyslexia. They called it, you know, you were slow… I knew I wasn't stupid, and I knew I wasn't dumb.",
    quoteBy: '— Whoopi Goldberg',
    stat: 'Decoding text takes constant extra effort. It is made harder by a world that often mistakes a difference in how the brain processes language for a lack of intelligence.',
    source: '',
    task: 'Order the item the waiter asks for before they lose patience.',
    supportTask: 'Same task, with clear spacing and read-aloud.',
    helped: 'Clear spacing, a readable font and read-aloud.',
    action: 'Judge ideas, not spelling. Share information in more than one way.',
  },
  {
    id: 'faceBlindness',
    title: 'Face blindness',
    icon: '👥',
    accent: '#CC79A7',
    tagline: 'A room full of strangers, every time',
    quote: "I can't recognise faces, so I have to memorise distinguishing features instead.",
    quoteBy: '— Eleanor',
    stat: 'Not recognising the faces of people you love makes every social moment a puzzle. You rely on voice, clothes and context, and those can change.',
    source: '',
    task: 'Find your friend Sam at the party.',
    supportTask: 'Same task, with name tags.',
    helped: 'Name tags, and people introducing themselves.',
    action: 'Say your name when you say hello.',
  },
  {
    id: 'tinnitus',
    title: 'Tinnitus',
    icon: '👂',
    accent: '#0072B2',
    tagline: 'A sound that never switches off',
    quote: 'I had to get my mind around the concept that I would never hear silence again.',
    quoteBy: '— Mike, who lives with tinnitus',
    stat: "There's no switch to turn it off. For many people, real silence becomes something they only remember, and the ringing makes it harder to pick voices out of background noise.",
    source: '',
    task: 'Listen for your name when the barista calls it.',
    supportTask: 'Same task, with live captions.',
    warning: 'This room plays a continuous high-pitched tone. Please lower your volume before you begin.',
    helped: 'Live captions and a visual "order ready" screen.',
    action: 'Face people when you speak, and caption what you share.',
  },
  {
    id: 'schizophrenia',
    title: 'Schizophrenia',
    icon: '💭',
    accent: '#D55E00',
    tagline: 'Concentrating while voices talk over you',
    quote: "It's like a conversation happening right in front of me, and I am the only one who can hear it.",
    quoteBy: '— A person living with schizophrenia',
    stat: 'Experiences vary widely. For many people, the hardest part is the everyday effort of finishing a simple task while voices or other hallucinations compete for their attention.',
    source: '',
    task: 'Fill in a short job application.',
    supportTask: 'Same task, with a calm guide and a quiet space.',
    warning: 'This room includes whispered voices and visual hallucinations (shadowy figures, a spider, a cat, rippling walls). Nothing jumps out or flashes. This is one person’s experience; it varies widely.',
    helped: 'Clear, calm instructions, extra time and a quiet space.',
    action: "Don't assume rudeness. Ask, 'What would help?'",
  },
  {
    id: 'reflection',
    title: 'Reflection',
    icon: '🌱',
    accent: '#2B2B2E',
    tagline: 'What changed, and what you can do',
    quote: '',
    quoteBy: '',
    stat: '',
    source: '',
    task: '',
    supportTask: '',
    helped: '',
    action: '',
  },
];

export const roomInfo = (id: RoomId): RoomInfo => ROOMS.find((r) => r.id === id)!;

export const COPY = {
  title: 'Through My Eyes',
  subtitle: 'See the struggle, then see the solution.',
  disclaimer: 'A simulation, not the real thing. Experiences vary from person to person.',
  description:
    'Walk through rooms that each simulate a health condition. Try an everyday task, then turn on support and see how small changes make it easier.',
};
