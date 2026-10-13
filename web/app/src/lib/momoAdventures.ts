/** Optional, self-reported discoveries. They never read or change a food log. */
export const MOMO_ADVENTURES = [
  {
    id: 'color', title: 'Color detective', sticker: 'Color spotter',
    prompt: 'Spot a color in your meal, mug, or the room around you. What catches your eye?',
    options: [{ id: 'bright', label: 'Something bright' }, { id: 'warm', label: 'Something warm' }, { id: 'green', label: 'Something green' }],
    quip: 'Excellent detective work. My only clue was “probably pink.”',
    shelfQuip: 'Color spotter, reporting for shelf duty. I wore my brightest pleats.',
  },
  {
    id: 'texture', title: 'Texture scout', sticker: 'Crunch club',
    prompt: 'Think of a bite you enjoyed. Which texture made it interesting?',
    options: [{ id: 'crunchy', label: 'A little crunch' }, { id: 'creamy', label: 'Smooth and creamy' }, { id: 'mixed', label: 'A bit of everything' }],
    quip: 'A texture review! Finally, someone appreciates my pleats.',
    shelfQuip: 'Crunch club has a display now. Please keep the crumbs artistic.',
  },
  {
    id: 'comfort', title: 'Comfort curator', sticker: 'Cozy classic',
    prompt: 'Picture a familiar meal you love. What makes it feel like yours?',
    options: [{ id: 'flavor', label: 'That familiar flavor' }, { id: 'company', label: 'The company' }, { id: 'ritual', label: 'The little ritual' }],
    quip: 'Comfort collected. I would put on slippers, but I am mostly feet.',
    shelfQuip: 'A cozy classic for the shelf. I have mentally added a tiny blanket.',
  },
  {
    id: 'aroma', title: 'Aroma explorer', sticker: 'Nose for joy',
    prompt: 'Recall a kitchen smell that makes you smile. Where does it take you?',
    options: [{ id: 'fresh', label: 'Fresh and zesty' }, { id: 'toasty', label: 'Warm and toasty' }, { id: 'spiced', label: 'Full of spice' }],
    quip: 'My nose has left the chat. It is following something delicious.',
    shelfQuip: 'A nose for joy! This shelf smells like excellent taste. Metaphorically.',
  },
  {
    id: 'sound', title: 'Kitchen DJ', sticker: 'Snack soundtrack',
    prompt: 'Give your imaginary kitchen a soundtrack. What is the opening beat?',
    options: [{ id: 'sizzle', label: 'The pan sizzle' }, { id: 'crunch', label: 'The first crunch' }, { id: 'clink', label: 'A cheerful clink' }],
    quip: 'Dropping my debut album: Now That’s What I Call Lunch.',
    shelfQuip: 'Snack soundtrack is on display. The shelf is now accepting song requests.',
  },
  {
    id: 'pause', title: 'Tiny pause', sticker: 'Pocket of calm',
    prompt: 'Take a small moment for yourself, whenever you like. Pick your kind of pause.',
    options: [{ id: 'look', label: 'Notice something nearby' }, { id: 'breathe', label: 'Take an easy breath' }, { id: 'settle', label: 'Get comfortable' }],
    quip: 'Doing absolutely one small thing. A very respectable agenda.',
    shelfQuip: 'Pocket of calm, front and center. Even my enthusiasm is wearing slippers.',
  },
] as const

export type MomoAdventure = typeof MOMO_ADVENTURES[number]
export type AdventureId = MomoAdventure['id']
export interface AdventureCollection {
  version: 1
  choices: Partial<Record<AdventureId, string>>
  pinned?: AdventureId
}

export function emptyAdventureCollection(): AdventureCollection { return { version: 1, choices: {} } }

export function adventureStorageKey(accountId: string): string {
  return `poiem-little-adventures-v1:${accountId}`
}

export function sanitizeAdventureCollection(raw: unknown): AdventureCollection {
  const clean = emptyAdventureCollection()
  if (!raw || typeof raw !== 'object' || !('version' in raw) || raw.version !== 1
    || !('choices' in raw) || !raw.choices || typeof raw.choices !== 'object') return clean
  for (const adventure of MOMO_ADVENTURES) {
    const choice: unknown = (raw.choices as Record<string, unknown>)[adventure.id]
    if (adventure.options.some(option => option.id === choice)) clean.choices[adventure.id] = choice as string
  }
  if ('pinned' in raw) {
    const pinned = MOMO_ADVENTURES.find(adventure => adventure.id === raw.pinned)
    if (pinned && clean.choices[pinned.id] !== undefined) clean.pinned = pinned.id
  }
  return clean
}

export function readAdventureCollection(accountId: string): AdventureCollection {
  if (!accountId) return emptyAdventureCollection()
  try { return readStoredAdventureCollection(accountId) }
  catch { return emptyAdventureCollection() }
}

/** A readable missing or corrupt copy is empty; an inaccessible store still throws. */
function readStoredAdventureCollection(accountId: string): AdventureCollection {
  const raw = localStorage.getItem(adventureStorageKey(accountId))
  try { return sanitizeAdventureCollection(JSON.parse(raw ?? 'null')) }
  catch { return emptyAdventureCollection() }
}

/** A stale view contributes only discoveries whose writes explicitly failed. */
function latestWithPendingChoices(
  accountId: string, current: AdventureCollection, pendingChoices: AdventureCollection['choices'],
): AdventureCollection {
  let latest: AdventureCollection
  try { latest = readStoredAdventureCollection(accountId) }
  catch { latest = sanitizeAdventureCollection(current) }
  return sanitizeAdventureCollection({ ...latest, choices: {
    ...latest.choices,
    ...sanitizeAdventureCollection({ version: 1, choices: pendingChoices }).choices,
  } })
}

function saveAdventureCollection(accountId: string, collection: AdventureCollection): boolean {
  try {
    localStorage.setItem(adventureStorageKey(accountId), JSON.stringify(collection))
    return true
  } catch { return false }
}

/** Keep the latest saved copy, including clears, plus explicitly unsaved discoveries. */
export function collectAdventure(
  accountId: string, current: AdventureCollection, id: AdventureId, choice: string,
  pendingChoices: AdventureCollection['choices'] = {},
  pendingPin?: AdventureId | null,
): {
  collection: AdventureCollection; saved: boolean
} {
  const adventure = MOMO_ADVENTURES.find(item => item.id === id)
  if (!accountId || !adventure?.options.some(option => option.id === choice)) return { collection: current, saved: false }
  const latest = latestWithPendingChoices(accountId, current, pendingChoices)
  const collection = sanitizeAdventureCollection({ ...latest,
    pinned: pendingPin === undefined ? latest.pinned : pendingPin,
    choices: {
    ...latest.choices,
    [id]: choice,
  } })
  return { collection, saved: saveAdventureCollection(accountId, collection) }
}

/** Pin a collected sticker, preserving the newest readable choices and other-tab clears. */
export function pinAdventure(
  accountId: string, current: AdventureCollection, id: AdventureId | null,
  pendingChoices: AdventureCollection['choices'] = {},
): {
  collection: AdventureCollection; saved: boolean; available: boolean
} {
  if (!accountId) return { collection: current, saved: false, available: false }
  const latest = latestWithPendingChoices(accountId, current, pendingChoices)
  const available = id === null || MOMO_ADVENTURES.some(adventure => adventure.id === id && latest.choices[adventure.id] !== undefined)
  if (!available) return { collection: latest, saved: false, available: false }
  const collection = sanitizeAdventureCollection({ ...latest, pinned: id })
  return { collection, saved: saveAdventureCollection(accountId, collection), available: true }
}

/** Also called by the account deletion flow, which surfaces a failed device cleanup. */
export function clearAdventureCollection(accountId: string): void {
  if (accountId) localStorage.removeItem(adventureStorageKey(accountId))
}
