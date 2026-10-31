export const ZONES = [
  {
    id: 'labyrinth',
    index: 0,
    numeral: 'I',
    name: 'Azure Labyrinth',
    short: 'Labyrinth',
    glyph: '◇',
    accent: '#7fe6ff',
    objective: 'Attune a focus prism',
    arrival: 'The blue maze keeps every promise you make to the day.',
  },
  {
    id: 'grotto',
    index: 1,
    numeral: 'II',
    name: 'Prism Grotto',
    short: 'Grotto',
    glyph: '◈',
    accent: '#8fb8ff',
    objective: 'Explore the deep crystal',
    arrival: 'Light bends differently where the maze keeps its deeper secrets.',
  },
  {
    id: 'spire',
    index: 2,
    numeral: 'III',
    name: 'Skyglass Spire',
    short: 'Spire',
    glyph: '✦',
    accent: '#b9f0ff',
    objective: 'Look back on the day',
    arrival: 'Above the clouds, the glass remembers every hour you kept.',
  },
]

// Effective study techniques. Each vow is bound to one of these rituals.
export const TECHNIQUES = [
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    glyph: '◷',
    accent: '#7fe6ff',
    minutes: 25,
    ritual: 26,
    blurb: '25 min single-task sprint · 5 min breath',
    tip: 'One vow only. When the sprint ends, stand up, look away, and breathe before the next round.',
  },
  {
    id: 'recall',
    name: 'Active Recall',
    glyph: '?',
    accent: '#8fb8ff',
    minutes: 15,
    ritual: 20,
    blurb: 'Close the book · write what you remember',
    tip: 'Shut the notes and retrieve the answer from memory first. Check the source only afterwards.',
  },
  {
    id: 'spaced',
    name: 'Spaced Repetition',
    glyph: '↻',
    accent: '#9fd0ff',
    minutes: 20,
    ritual: 23,
    blurb: 'Revisit today, yesterday, and last week',
    tip: 'Review the oldest material first, then the newest. Spacing beats cramming.',
  },
  {
    id: 'feynman',
    name: 'Feynman',
    glyph: '✧',
    accent: '#a8e6ff',
    minutes: 15,
    ritual: 19,
    blurb: 'Explain it simply, aloud, to a friend',
    tip: 'Explain the idea in plain words as if teaching a friend. Where you stumble is where you study.',
  },
  {
    id: 'interleave',
    name: 'Interleaving',
    glyph: '⌘',
    accent: '#b8c8ff',
    minutes: 20,
    ritual: 23,
    blurb: 'Mix related problem types in one set',
    tip: 'Shuffle problem types instead of doing twenty of the same. Your brain must choose the method.',
  },
  {
    id: 'sq3r',
    name: 'SQ3R',
    glyph: '▤',
    accent: '#8ee8e0',
    minutes: 30,
    ritual: 28,
    blurb: 'Survey · Question · Read · Recite · Review',
    tip: 'Skim headings, turn them into questions, read to answer them, then recite and review.',
  },
  {
    id: 'cornell',
    name: 'Cornell Notes',
    glyph: '▥',
    accent: '#a9d8ff',
    minutes: 20,
    ritual: 22,
    blurb: 'Notes, cues, and a summary column',
    tip: 'Keep a cue column for questions and a bottom strip for a five-line summary.',
  },
  {
    id: 'deep',
    name: 'Deep Work',
    glyph: '◉',
    accent: '#c6f2ff',
    minutes: 45,
    ritual: 34,
    blurb: 'One block · no notifications · one outcome',
    tip: 'Name the single outcome before you begin. Phone away, tabs closed, one block of attention.',
  },
]

export const TECHNIQUE_ORDER = TECHNIQUES.map((t) => t.id)

export const FRIENDS = [
  {
    id: 'lyra',
    name: 'Lyra',
    glyph: '✦',
    color: '#7fe6ff',
    perk: '+10% focus speed',
    effect: 'focus',
    value: 0.1,
  },
  {
    id: 'nix',
    name: 'Nix',
    glyph: '☾',
    color: '#b8a4ff',
    perk: '+15% ritual time',
    effect: 'time',
    value: 0.15,
  },
  {
    id: 'ori',
    name: 'Ori',
    glyph: '☀',
    color: '#ffd98a',
    perk: 'Wards the first weakness each day',
    effect: 'ward',
    value: 1,
  },
]

export const SHOP_ITEMS = [
  {
    id: 'focus-charm',
    name: 'Focus Charm',
    glyph: '✦',
    price: 35,
    kind: 'charm',
    effect: 'focus',
    value: 0.22,
    blurb: 'A humming shard. Focus fills 22% faster while it rests in your satchel.',
  },
  {
    id: 'glass-hour',
    name: 'Glass Hour',
    glyph: '⧖',
    price: 30,
    kind: 'charm',
    effect: 'time',
    value: 0.2,
    blurb: 'Adds 20% to every ritual timer. The maze gives you a little more room to breathe.',
  },
  {
    id: 'ward-crystal',
    name: 'Ward Crystal',
    glyph: '◇',
    price: 25,
    kind: 'consumable',
    effect: 'ward',
    blurb: 'Blocks the next weakness. It shatters so you do not have to.',
  },
  {
    id: 'ember-heart',
    name: 'Ember Heart',
    glyph: '♥',
    price: 55,
    kind: 'consumable',
    effect: 'heart',
    blurb: 'Restores one heart, up to five. Warmth for a long vigil.',
  },
  {
    id: 'satchel-latch',
    name: 'Satchel Latch',
    glyph: '▦',
    price: 45,
    kind: 'consumable',
    effect: 'slot',
    blurb: 'Adds one satchel slot, up to eight. Room for one more promise.',
  },
  {
    id: 'lantern-nix',
    name: 'Violet Lantern',
    glyph: '☾',
    price: 70,
    kind: 'friend',
    friend: 'nix',
    blurb: 'Calls Nix out of the deep crystal. She grants +15% ritual time.',
  },
  {
    id: 'lantern-ori',
    name: 'Amber Lantern',
    glyph: '☀',
    price: 70,
    kind: 'friend',
    friend: 'ori',
    blurb: 'Calls Ori down from the spire. He wards the first weakness each day.',
  },
  {
    id: 'pocket-sundial',
    name: 'Pocket Sundial',
    glyph: '◴',
    price: 40,
    kind: 'consumable',
    effect: 'time',
    value: 0.12,
    blurb: 'A one-day charm. Adds 12% to every ritual timer, then fades at nightfall.',
  },
]

export const TECHNIQUE_BY_ID = Object.fromEntries(TECHNIQUES.map((t) => [t.id, t]))
export const FRIEND_BY_ID = Object.fromEntries(FRIENDS.map((f) => [f.id, f]))
export const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]))

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function previousDayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dayKey(d)
}

export function techniqueById(id) {
  return TECHNIQUE_BY_ID[id] || TECHNIQUES[0]
}

export function friendById(id) {
  return FRIEND_BY_ID[id] || null
}

export function itemById(id) {
  return SHOP_BY_ID[id] || null
}

export function formatClock(minutes) {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60) % 24
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.ceil(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Four rotating items each day, seeded so the market is the same all day.
export function stockForDay(key = dayKey()) {
  const rand = seededRandom(hashString(`market|${key}`))
  const pool = SHOP_ITEMS.map((item) => ({ ...item }))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 4)
}

export const DAY_START = 8 * 60
export const DAY_END = 23 * 60 + 59

export const PACE_OPTIONS = {
  swift: { label: 'Swift', secondsPerMinute: 0.34, blurb: 'A whole day in about five minutes' },
  steady: { label: 'Steady', secondsPerMinute: 0.8, blurb: 'A whole day in about twelve minutes' },
  real: { label: 'Real clock', secondsPerMinute: 60, blurb: 'Follows the actual clock until 23:59' },
}

export const SUGGESTIONS = [
  { title: 'Read one chapter and mark three questions', technique: 'sq3r' },
  { title: 'Recall ten key terms without notes', technique: 'recall' },
  { title: 'Explain one hard concept aloud', technique: 'feynman' },
  { title: 'Review yesterday’s notes, then today’s', technique: 'spaced' },
  { title: 'Solve a mixed set of ten problems', technique: 'interleave' },
  { title: 'Write a five-line summary of the lesson', technique: 'cornell' },
]
