/**
 * Momo's wardrobe: which pieces exist, the slot each one fills, and how it
 * unlocks. Pieces are earned by showing up (logged days, never streaks) and by
 * trying a feature once. Nothing is sold, and nothing owned is taken back.
 */
import { ticketNumber } from './enamelAwards'

export const WARDROBE_SLOTS = ['head', 'face', 'neck', 'body', 'hand'] as const
export type WardrobeSlot = typeof WARDROBE_SLOTS[number]
export type Outfit = Partial<Record<WardrobeSlot, string>>

export const SLOT_LABELS: Record<WardrobeSlot, string> = {
  head: 'Head', face: 'Face', neck: 'Neck', body: 'Body', hand: 'Hand',
}

export type WardrobeFirst = 'photoLog' | 'note' | 'fullWater' | 'threeMains' | 'savedMeal'
export type UnlockRule =
  | { kind: 'start' }
  | { kind: 'loggedDays'; days: number }
  | { kind: 'first'; first: WardrobeFirst }
  | { kind: 'anniversary' }

export interface WardrobePiece {
  id: string
  slot: WardrobeSlot
  name: string
  unlock: UnlockRule
}

const days = (count: number): UnlockRule => ({ kind: 'loggedDays', days: count })
const first = (event: WardrobeFirst): UnlockRule => ({ kind: 'first', first: event })

/** In the order they tend to arrive. Ids match PIECE_ART in momoArt.ts. */
export const WARDROBE: readonly WardrobePiece[] = [
  { id: 'blossom', slot: 'head', name: 'Blossom clip', unlock: { kind: 'start' } },
  { id: 'pencil', slot: 'hand', name: 'Pencil', unlock: days(3) },
  { id: 'bow', slot: 'neck', name: 'Bow', unlock: days(5) },
  { id: 'scarf', slot: 'neck', name: 'Scarf', unlock: days(7) },
  { id: 'beanie', slot: 'head', name: 'Beanie', unlock: days(10) },
  { id: 'chef-hat', slot: 'head', name: 'Chef toque', unlock: days(14) },
  { id: 'apron', slot: 'body', name: 'Apron', unlock: days(21) },
  { id: 'specs', slot: 'face', name: 'Round specs', unlock: days(30) },
  { id: 'mug', slot: 'hand', name: 'Mug of tea', unlock: days(45) },
  { id: 'medal', slot: 'neck', name: 'Logging medal', unlock: days(60) },
  { id: 'paper-crown', slot: 'head', name: 'Paper crown', unlock: days(90) },
  { id: 'jumper', slot: 'body', name: 'Stripy jumper', unlock: days(120) },
  { id: 'sunnies', slot: 'face', name: 'Sunnies', unlock: first('photoLog') },
  { id: 'beret', slot: 'head', name: 'Beret', unlock: first('note') },
  { id: 'bucket-hat', slot: 'head', name: 'Bucket hat', unlock: first('fullWater') },
  { id: 'whisk', slot: 'hand', name: 'Whisk', unlock: first('threeMains') },
  { id: 'bandana', slot: 'neck', name: 'Bandana', unlock: first('savedMeal') },
  { id: 'party-hat', slot: 'head', name: 'Party hat', unlock: { kind: 'anniversary' } },
  { id: 'balloon', slot: 'hand', name: 'Balloon', unlock: { kind: 'anniversary' } },
]

const BY_ID = new Map(WARDROBE.map(piece => [piece.id, piece]))

export function wardrobePiece(id: string): WardrobePiece | undefined {
  return BY_ID.get(id)
}

export interface WardrobeProgress {
  loggedDays: number
  firsts: Record<WardrobeFirst, boolean>
  daysSinceStart: number
}

export interface WardrobeSource {
  foodEntries: readonly { timestamp: string; localDate?: string; source: string }[]
  favoriteMeals: readonly unknown[]
  gamification: {
    waterByDate: Record<string, number>
    notesByDate: Record<string, number>
    awardedKeys: readonly string[]
    startedAt: string
  }
}

const FULL_WATER_GLASSES = 8
const DAY_MS = 86_400_000

export function wardrobeProgress({ foodEntries, favoriteMeals, gamification }: WardrobeSource, now = new Date()): WardrobeProgress {
  const started = Date.parse(gamification.startedAt)
  return {
    loggedDays: ticketNumber([...foodEntries]),
    firsts: {
      photoLog: foodEntries.some(entry => entry.source === 'snapFood'),
      note: Object.values(gamification.notesByDate).some(count => count > 0),
      fullWater: Object.values(gamification.waterByDate).some(count => count >= FULL_WATER_GLASSES),
      threeMains: gamification.awardedKeys.some(key => key.startsWith('enamel-mains-')),
      savedMeal: favoriteMeals.length > 0,
    },
    daysSinceStart: Number.isFinite(started) ? Math.floor((now.getTime() - started) / DAY_MS) : 0,
  }
}

const FIRST_LABELS: Record<WardrobeFirst, string> = {
  photoLog: 'First photo log',
  note: 'First kitchen note',
  fullWater: 'First full water day',
  threeMains: 'First day with breakfast, lunch and dinner',
  savedMeal: 'First saved meal',
}

export function unlockLabel(rule: UnlockRule): string {
  switch (rule.kind) {
    case 'start': return 'Yours from the start'
    case 'loggedDays': return `${rule.days} logged days`
    case 'first': return FIRST_LABELS[rule.first]
    case 'anniversary': return 'A year of Poiem'
  }
}

export function isUnlocked(piece: WardrobePiece, progress: WardrobeProgress): boolean {
  const rule = piece.unlock
  switch (rule.kind) {
    case 'start': return true
    case 'loggedDays': return progress.loggedDays >= rule.days
    case 'first': return progress.firsts[rule.first]
    case 'anniversary': return progress.daysSinceStart >= 365
  }
}

/** Everything Momo can wear right now: pieces already owned plus pieces unlocked. */
export function availablePieceIds(owned: readonly string[], progress: WardrobeProgress): Set<string> {
  return new Set(WARDROBE.filter(piece => owned.includes(piece.id) || isUnlocked(piece, progress)).map(piece => piece.id))
}

/** Unlocked but not yet shown. The celebration reveals these once, then claims them. */
export function newPieces(owned: readonly string[], progress: WardrobeProgress): WardrobePiece[] {
  return WARDROBE.filter(piece => piece.unlock.kind !== 'start' && !owned.includes(piece.id) && isUnlocked(piece, progress))
}

export function claimPieces<T extends { ownedCosmeticIds: string[] }>(ledger: T, ids: readonly string[]): T {
  const missing = ids.filter(id => BY_ID.has(id) && !ledger.ownedCosmeticIds.includes(id))
  return missing.length ? { ...ledger, ownedCosmeticIds: [...ledger.ownedCosmeticIds, ...missing] } : ledger
}

/**
 * Reads a stored outfit. State saved before slots existed had one worn piece in
 * `equippedCosmeticId`; that piece moves into its slot. Unknown pieces are dropped.
 */
export function normalizeOutfit(value: unknown, legacyEquipped?: unknown): Outfit {
  const outfit: Outfit = {}
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [slot, id] of Object.entries(value as Record<string, unknown>)) {
      const piece = typeof id === 'string' ? BY_ID.get(id) : undefined
      if (piece && piece.slot === slot) outfit[piece.slot] = piece.id
    }
    return outfit
  }
  const legacy = typeof legacyEquipped === 'string' ? BY_ID.get(legacyEquipped) : undefined
  if (legacy) outfit[legacy.slot] = legacy.id
  return outfit
}

export interface WardrobeLedger {
  ownedCosmeticIds: string[]
  outfit: Outfit
}

/** Puts a piece on in its slot, or takes it off if it is already worn. Null for a locked piece. */
export function wearPiece<T extends WardrobeLedger>(ledger: T, id: string, progress: WardrobeProgress): T | null {
  const piece = BY_ID.get(id)
  if (!piece || !availablePieceIds(ledger.ownedCosmeticIds, progress).has(id)) return null
  const outfit: Outfit = { ...ledger.outfit }
  if (outfit[piece.slot] === id) delete outfit[piece.slot]
  else outfit[piece.slot] = id
  return { ...claimPieces(ledger, [id]), outfit }
}

/** A random look from available pieces; each slot has a fair chance of staying empty. */
export function surpriseOutfit(available: ReadonlySet<string>, random: () => number = Math.random): Outfit {
  const outfit: Outfit = {}
  for (const slot of WARDROBE_SLOTS) {
    const choices = WARDROBE.filter(piece => piece.slot === slot && available.has(piece.id))
    if (choices.length === 0 || random() < 0.35) continue
    outfit[slot] = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))].id
  }
  return outfit
}
