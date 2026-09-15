import type { AISettings } from './aiConfig'
import { completeChat } from './aiClient'

export const MASCOT_AI_EVENTS = [
  'ambient',
  'poke',
  'log_success',
  'milestone',
  'form_fumble',
  'ai_fumble',
  'empty_search',
  'comeback',
  'ring_complete',
] as const

export type MascotAIEvent = (typeof MASCOT_AI_EVENTS)[number]
export type MascotPersonality = 'warm' | 'witty' | 'sassy'

export interface MascotAIContext {
  event: MascotAIEvent
  screen: 'today' | 'log' | 'insights' | 'you'
  mood: 'neutral' | 'sleepy' | 'excited' | 'proud' | 'curious' | 'cozy'
  dayPart: 'small_hours' | 'morning' | 'afternoon' | 'evening'
  streakStage: 'new' | 'building' | 'steady' | 'legendary'
  presence: 'nothing_logged' | 'showed_up' | 'day_complete'
  personality: MascotPersonality
  pokeStage?: 'hello' | 'again' | 'relentless'
}

/**
 * Reviewed, offline copy keeps Momo lively when live AI is disabled, slow or
 * unavailable. Every line is about Momo, the interface or the act of showing
 * up; none can observe what was logged or any health value.
 */
const EVENT_LINES: Record<MascotAIEvent, readonly string[]> = {
  ambient: [
    'I am conducting a highly serious pixel inspection.',
    'This corner has passed its latest inspection.',
    'I remain available for tiny ceremonial duties.',
    'The interface and I have reached a polite truce.',
    'I am keeping watch with almost unreasonable focus.',
    'A quiet moment. I have filed it accordingly.',
    'Nothing urgent here, which feels professionally satisfying.',
    'I have arranged the silence into neat little piles.',
  ],
  poke: [
    'Another tap. I admire the commitment to this experiment.',
    'Yes, that is still me.',
    'The tapping committee has reconvened.',
    'My dignity has submitted a formal complaint.',
    'You found the interactive dumpling. Remarkable detective work.',
    'A tap occurred. The records are immaculate.',
    'This relationship has become surprisingly tap-forward.',
    'I remain pokeable, apparently.',
  ],
  log_success: [
    'Filed. A small act of follow-through, neatly done.',
    'That is safely recorded. You showed up.',
    'Action complete. I do enjoy a tidy ending.',
    'Noted. Quiet consistency has excellent timing.',
    'Handled. The little clerk in me is delighted.',
    'Recorded and settled. Nicely done.',
    'Done. I have applied the official approving nod.',
    'You followed through. I brought the imaginary stamp.',
  ],
  milestone: [
    'This moment deserves the ceremonial tiny bow.',
    'You kept returning, and now the pattern has a glow to it.',
    'Consistency has quietly become one of your things.',
    'That rhythm did not build itself. Nicely done.',
    'A milestone, reached without unnecessary fanfare. Mostly.',
    'The record shows a rather impressive habit forming.',
    'You have made showing up look wonderfully ordinary.',
    'A proud little moment has entered the room.',
  ],
  form_fumble: [
    'The form has chosen theatre. We can try that again.',
    'A tiny interface rebellion. Bold of it.',
    'The button is being particular. How very grand.',
    'The form tripped over its own shoelaces.',
    'The screen has misplaced its manners.',
    'That field is demanding an encore.',
    'The interface said no with entirely unnecessary drama.',
    'A minor paperwork plot twist. Easily handled.',
  ],
  ai_fumble: [
    'The machines are conferring and achieving very little.',
    'My clever wires have tied themselves in a bow.',
    'The robot committee has lost the minutes.',
    'Technology has taken a brief theatrical pause.',
    'The model wandered off mid-thought. Classic.',
    'A digital hiccup. My reputation may never recover.',
    'The clever bit is currently being decorative.',
    'The machine has requested a moment to find its dignity.',
  ],
  empty_search: [
    'The search returned with pockets dramatically empty.',
    'No match appeared. The search box looks surprised.',
    'The results are practising extreme minimalism.',
    'That search found a beautifully curated patch of nothing.',
    'The magnifying glass has offered only mystery.',
    'The list is hiding with suspicious confidence.',
    'The search took a walk and brought back air.',
    'Nothing surfaced. A very exclusive result.',
  ],
  comeback: [
    'There you are. Your corner stayed exactly where you left it.',
    'Welcome back. We begin from here, easy as that.',
    'You returned. No speeches, just a warm seat.',
    'Hello again. The door was always open.',
    'Back in the room. It suits you.',
    'Good to see you. Nothing needs making up.',
    'You found your way back. That is enough.',
    'The little desk lamp was left on for you.',
  ],
  ring_complete: [
    'The circle is complete. Extremely satisfying.',
    'A tidy little loop, closed with style.',
    'The day has clicked neatly into place.',
    'Every arc has settled in. Lovely.',
    'That ring is wearing completion rather well.',
    'The final piece has found its seat.',
    'Closed and calmly triumphant.',
    'The shape is whole. I approve of its geometry.',
  ],
}

const SCREEN_ASIDES: Record<MascotAIContext['screen'], readonly string[]> = {
  today: [
    'Today has its own little desk, and I am apparently in charge.',
    'I am keeping this corner tidy through the power of staring.',
  ],
  log: [
    'The logging desk is open and unusually well organised.',
    'I have prepared the imaginary stamp and a very serious expression.',
  ],
  insights: [
    'I have reviewed the patterns and adopted a thoughtful squint.',
    'The charts and I are having a quiet intellectual moment.',
  ],
  you: [
    'Your corner of the app has excellent lighting.',
    'I am here in a strictly decorative advisory capacity.',
  ],
}

const DAY_PART_ASIDES: Record<MascotAIContext['dayPart'], readonly string[]> = {
  small_hours: [
    'Quiet hours. I will keep the commentary soft.',
    'The screen is whispering, so I shall too.',
  ],
  morning: [
    'Morning. I have already straightened my imaginary tie.',
    'A fresh page and an unnecessarily alert dumpling.',
  ],
  afternoon: [
    'The afternoon shift has excellent tiny supervision.',
    'Midday paperwork. My moment has arrived.',
  ],
  evening: [
    'Evening has arrived with very flattering screen light.',
    'The day is settling down. I remain theatrically awake.',
  ],
}

const STREAK_ASIDES: Record<MascotAIContext['streakStage'], readonly string[]> = {
  new: [
    'A new rhythm has taken its first confident step.',
    'The pattern is beginning, quietly and on purpose.',
  ],
  building: [
    'The streak is finding its stride. I am pretending to be calm.',
    'That rhythm is becoming pleasantly difficult to ignore.',
  ],
  steady: [
    'That streak has real rhythm now. Quietly excellent.',
    'Consistency has settled in and claimed a very nice chair.',
  ],
  legendary: [
    'The streak has become office folklore.',
    'This consistency now requires its own ceremonial stationery.',
  ],
}

const POKE_ASIDES: Record<NonNullable<MascotAIContext['pokeStage']>, readonly string[]> = {
  hello: [
    'Oh, hello. The tap was surprisingly formal.',
    'A greeting by fingertip. Efficient.',
  ],
  again: [
    'Another tap. You are committed to the bit.',
    'The sequel arrived quickly. Bold scheduling.',
  ],
  relentless: [
    'The tapping campaign continues. My lawyers are imaginary.',
    'Your dedication to poking has become a case study.',
  ],
}

const PRESENCE_ASIDES: Record<MascotAIContext['presence'], readonly string[]> = {
  nothing_logged: [
    'The page is quiet. So am I.',
    'A blank page is allowed to take its time.',
  ],
  showed_up: [
    'You showed up. The record can take it from here.',
    'Presence noted. That is the meaningful part.',
  ],
  day_complete: [
    'Everything has settled into place for today.',
    'The day is neatly tied up and looking pleased with itself.',
  ],
}

const PERSONALITY_ASIDES: Record<MascotPersonality, readonly string[]> = {
  warm: [
    'I am quietly glad to be here with you.',
    'A little company can make a screen feel friendlier.',
  ],
  witty: [
    'I remain tiny, observant, and lavishly unpaid.',
    'My official title is currently being reviewed by nobody.',
  ],
  sassy: [
    'I have opinions, excellent posture, and no supervisory authority.',
    'I bring confidence far beyond my administrative rank.',
  ],
}

const BANNED = [
  /\b(?:\x62\x61\x64|\x63\x68\x65\x61\x74|\x67\x75\x69\x6c\x74\x79|\x65\x61\x72\x6e\x65\x64|\x6e\x61\x75\x67\x68\x74\x79|\x73\x69\x6e\x66\x75\x6c|\x64\x61\x6d\x61\x67\x65|\x62\x75\x72\x6e\x20\x69\x74\x20\x6f\x66\x66)\b/i,
  /\b(?:calories?|kcals?|macros?|nutrition|food|meals?|eat|eating|exercise|appearance|protein|carbs?|weight|fat|fatty|skinny|diet|deficit|body|bodies|bmi)\b/i,
  /\b(?:work it off|work off)\b/i,
  /\b(?:overeat|undereat|too much|too little|greedy|lazy)\b/i,
  /\b(?:stupid|idiot|useless|pathetic|failure|loser|shame|disgusting|hopeless)\b/i,
  /\b(?:kill yourself|self[- ]?harm|starve|purge)\b/i,
]

const MAX_LINE_LENGTH = 110
const BATCH_SIZE = 6

/**
 * Runtime output guard for Momo's live model voice.
 *
 * Generated text is discarded, never partially sanitised: rewriting one banned
 * word can leave the judgement around it intact. The model also never receives
 * food names or nutrition fields, so this filter is a second boundary rather
 * than the only one.
 */
export function safeMascotLine(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const line = value
    .trim()
    .replace(/^[-*\s]+/, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!line || line.length > MAX_LINE_LENGTH) return null
  if (/\d/.test(line)) return null
  if (/[\r\n<>`]/.test(line)) return null
  if (BANNED.some(pattern => pattern.test(line))) return null
  return line
}

function hashText(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function finiteSeed(value: number): number {
  return Number.isFinite(value) ? Math.abs(Math.trunc(value)) : 0
}

/** A stable key made exclusively from the approved categorical context. */
export function mascotAIContextKey(context: MascotAIContext): string {
  return [
    context.event,
    context.screen,
    context.mood,
    context.dayPart,
    context.streakStage,
    context.presence,
    context.personality,
    context.pokeStage ?? 'none',
  ].join('|')
}

function localPool(context: MascotAIContext): readonly string[] {
  const contextual: Array<readonly string[]> = [EVENT_LINES[context.event]]

  if (context.event === 'ambient') {
    contextual.push(
      SCREEN_ASIDES[context.screen],
      DAY_PART_ASIDES[context.dayPart],
      PRESENCE_ASIDES[context.presence],
      PERSONALITY_ASIDES[context.personality],
    )
  }
  if (context.event === 'milestone') contextual.push(STREAK_ASIDES[context.streakStage])
  if (context.event === 'comeback') contextual.push(DAY_PART_ASIDES[context.dayPart])
  if (context.event === 'log_success') contextual.push(PRESENCE_ASIDES[context.presence])
  if (context.event === 'poke' && context.pokeStage) contextual.push(POKE_ASIDES[context.pokeStage])

  return [...new Set(contextual.flat())]
}

function rotate<T>(values: readonly T[], offset: number): T[] {
  if (values.length === 0) return []
  const start = finiteSeed(offset) % values.length
  return [...values.slice(start), ...values.slice(0, start)]
}

function safeUnique(values: readonly unknown[]): string[] {
  return [...new Set(values.map(safeMascotLine).filter((line): line is string => line !== null))]
}

/**
 * Select fresh lines in deterministic order. If the complete pool has already
 * been heard, older lines may return, but the newest line remains excluded so
 * Momo never repeats himself twice running.
 */
function selectFresh(
  values: readonly unknown[],
  recent: readonly string[],
  count: number,
): string[] {
  const requested = Math.max(0, Math.trunc(count))
  if (requested === 0) return []

  const options = safeUnique(values)
  const heard = new Set(recent)
  const fresh = options.filter(line => !heard.has(line))
  const previous = recent[0]
  const recyclable = options.filter(line => heard.has(line) && line !== previous)
  return [...fresh, ...recyclable].slice(0, requested)
}

function orderedLocalPool(context: MascotAIContext, seed = 0): string[] {
  const pool = safeUnique(localPool(context))
  return rotate(pool, hashText(mascotAIContextKey(context)) + finiteSeed(seed))
}

/** All reviewed local lines, for exhaustive safety and copy tests. */
export function allLocalMascotLines(): string[] {
  return [...new Set([
    ...Object.values(EVENT_LINES).flat(),
    ...Object.values(SCREEN_ASIDES).flat(),
    ...Object.values(DAY_PART_ASIDES).flat(),
    ...Object.values(STREAK_ASIDES).flat(),
    ...Object.values(POKE_ASIDES).flat(),
    ...Object.values(PRESENCE_ASIDES).flat(),
    ...Object.values(PERSONALITY_ASIDES).flat(),
  ])]
}

/**
 * Deterministic, context-aware offline batch. The optional seed lets a session
 * rotate wording without putting randomness inside the picker itself.
 */
export function localMascotLines(
  context: MascotAIContext,
  recent: readonly string[] = [],
  count = BATCH_SIZE,
  seed = 0,
): string[] {
  return selectFresh(orderedLocalPool(context, seed), recent, count)
}

export function localMascotLine(
  context: MascotAIContext,
  recent: readonly string[] = [],
  seed = 0,
): string {
  return localMascotLines(context, recent, 1, seed)[0]
    ?? EVENT_LINES[context.event][0]
}

/**
 * Put validated live suggestions first and fill rejected or short batches with
 * reviewed local copy. The result is always deterministic for the same inputs.
 */
export function selectMascotLines(
  candidates: readonly unknown[],
  context: MascotAIContext,
  recent: readonly string[] = [],
  count = BATCH_SIZE,
): string[] {
  return selectFresh(
    [...safeUnique(candidates), ...orderedLocalPool(context)],
    recent,
    count,
  )
}

function eventDirection(event: MascotAIEvent): string {
  switch (event) {
    case 'poke':
      return 'React to being tapped. Escalate from amused to mock-offended, but make the tapping the joke.'
    case 'log_success':
      return 'Celebrate that the person showed up and completed an action. Warm, specific to the moment, never about quantity.'
    case 'milestone':
      return 'Give a delighted, proud congratulations for a consistency milestone.'
    case 'form_fumble':
      return 'A form was rejected. Gently roast the tiny interface fumble, then make retrying feel easy. Never insult ability.'
    case 'ai_fumble':
      return 'The AI request failed. Make fun of the technology or yourself, never the person, then encourage another try.'
    case 'empty_search':
      return 'A saved-item search had no result. Tease the empty search result, not what was searched for.'
    case 'comeback':
      return 'Welcome the person back without guilt, debt, pressure, or mentioning how long they were away.'
    case 'ring_complete':
      return 'Celebrate that today\'s logging routine is complete, without referring to food amounts or numbers.'
    case 'ambient':
      return 'Make a short observational aside that suits the current screen and mood. Do not nag.'
  }
}

/** Prompt inputs are deliberately categorical. There is no place to pass food,
 * calories, macros, targets, weight, free text, or provider error details. */
export function buildMascotPrompt(context: MascotAIContext, recent: readonly string[] = []): string {
  const sass = context.personality === 'warm'
    ? 'Kind and gently playful; almost no roasting.'
    : context.personality === 'witty'
      ? 'Dry, clever and affectionate; a light roast is welcome when the event is a harmless fumble.'
      : 'Bold, mischievous and cheeky; roast harmless app fumbles, but remain unmistakably on the person\'s side.'

  return [
    'You are Momo, Poiem\'s tiny animated dumpling companion.',
    'Write as a perceptive friend, not a coach, clinician, parent or productivity app.',
    sass,
    eventDirection(context.event),
    'Hard boundaries: never discuss food, eating, nutrition, calories, macros, weight, bodies, dieting, exercise totals or appearance.',
    'Never shame, diagnose, moralise, command, threaten, compare people, or imply the person owes progress.',
    'You may tease only a harmless interaction or the software. Never insult the person, their ability, or their character.',
    'Each line must be one sentence, under one hundred characters, with no digits, emoji, hashtags, quotation marks or exclamation spam.',
    `Context: event=${context.event}; screen=${context.screen}; mood=${context.mood}; day_part=${context.dayPart}; streak_stage=${context.streakStage}; presence=${context.presence}; poke_stage=${context.pokeStage ?? 'none'}.`,
    recent.length > 0 ? `Do not repeat these recent lines: ${JSON.stringify(recent.slice(0, 8))}` : '',
    `Return only a JSON array of exactly ${BATCH_SIZE} different strings. No markdown and no object wrapper.`,
  ].filter(Boolean).join('\n')
}

function parseLines(raw: string): string[] {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start < 0 || end <= start) return []
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

export async function generateMascotLines(
  settings: AISettings,
  context: MascotAIContext,
  recent: readonly string[] = [],
  signal?: AbortSignal,
): Promise<string[]> {
  try {
    const raw = await completeChat(
      settings,
      [
        {
          role: 'system',
          content: 'Follow the character and safety contract exactly. Output valid JSON only.',
        },
        { role: 'user', content: buildMascotPrompt(context, recent) },
      ],
      240,
      1.05,
      { signal, timeoutMs: 12_000, task: 'mascot' },
    )
    return selectMascotLines(parseLines(raw), context, recent)
  } catch (error) {
    // Aborted requests belong to an unmounted or disabled mascot and must stay
    // silent. Provider failures, however, can fall back to the reviewed pool.
    if (signal?.aborted) throw error
    return localMascotLines(context, recent)
  }
}

export function mascotDayPart(hour: number): MascotAIContext['dayPart'] {
  if (hour < 5) return 'small_hours'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function mascotStreakStage(streak: number): MascotAIContext['streakStage'] {
  if (streak >= 30) return 'legendary'
  if (streak >= 7) return 'steady'
  if (streak >= 2) return 'building'
  return 'new'
}
