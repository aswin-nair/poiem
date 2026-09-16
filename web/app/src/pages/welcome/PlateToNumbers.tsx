import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import * as m from 'motion/react-m'
import { useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useCountUp } from '../../hooks/useCountUp'
import { PlateArt } from './PlateArt'
import { mealKcal, SAMPLE_MEALS, type MealItem } from './meals'
import { useMediaQuery } from './useMediaQuery'

const MEAL = SAMPLE_MEALS[0]
const TOTAL = mealKcal(MEAL)
const PHASES = ['Plate', 'Numbers', 'Journal'] as const
/** The sticky stage sits just under the condensed header. */
const HEADER_HEIGHT = 62
/** Grams that fill a macro bar. */
const MACRO_SCALE = 80
const MACROS = [
  { label: 'Protein', key: 'protein', tone: 'var(--wp-accent)' },
  { label: 'Carbs', key: 'carbs', tone: 'var(--wp-hot)' },
  { label: 'Fat', key: 'fat', tone: 'var(--wp-fg)' },
] as const

function barWidth(grams: number): string {
  return `${Math.min(100, Math.round((grams / MACRO_SCALE) * 100))}%`
}

function Head({ phase }: { phase: number }) {
  return (
    <header className="wp-p2n-head">
      <div>
        <p className="wp-label">[01] From plate to numbers</p>
        <h2 id="p2n-title">One plate.<br /><span>The whole story.</span></h2>
      </div>
      <ol className="wp-p2n-phases" aria-label="Sequence">
        {PHASES.map((name, i) => <li key={name} className={phase === i ? 'is-active' : undefined}>0{i + 1} {name}</li>)}
      </ol>
    </header>
  )
}

/** The entry reads like a nutrition label: title and serving, heavy rules, foods, calories, then macros. */
function EntryCard({ items, kcal, widths }: { items: ReactNode; kcal: ReactNode; widths: readonly (string | MotionValue<string>)[] }) {
  return (
    <>
      <p className="wp-nl-kicker"><span>New entry</span><span>Sample</span></p>
      <h3 className="wp-nl-title">{MEAL.name}</h3>
      <p className="wp-nl-serving"><span>Breakfast</span><span>1 plate</span></p>
      <span className="wp-nl-rule is-thick" aria-hidden="true" />
      <ul className="wp-p2n-items">{items}</ul>
      <span className="wp-nl-rule is-medium" aria-hidden="true" />
      <p className="wp-nl-kcal"><span>Calories</span>{' '}<strong className="tabular">{kcal}</strong></p>
      <span className="wp-nl-rule is-medium" aria-hidden="true" />
      <ul className="wp-entry-macros">
        {MACROS.map((macro, i) => (
          <li key={macro.key}>
            <span>{macro.label}</span>
            <strong>{MEAL[macro.key]} g</strong>
            <span className="wp-bar"><m.span style={{ width: widths[i], background: macro.tone }} /></span>
          </li>
        ))}
      </ul>
      <span className="wp-nl-rule is-thick" aria-hidden="true" />
      <p className="wp-nl-note">Sample estimate. Edit anything before you save.</p>
    </>
  )
}

function PhoneScreen({ flash, flashY }: { flash: MotionValue<number> | number; flashY?: MotionValue<number> }) {
  return (
    <figure className="wp-figure wp-p2n-screen">
      <figcaption className="wp-figure-bar"><span>Fig. 01 — Today</span><span>App screen</span></figcaption>
      <div className="wp-p2n-shot">
        <img src={`${import.meta.env.BASE_URL}showcase/today.jpg`} alt="Poiem’s Today screen with logged meals, calories left and macros" width={390} height={844} loading="lazy" decoding="async" />
        <m.p className="wp-p2n-flash" style={flashY ? { opacity: flash, y: flashY } : { opacity: flash }} aria-hidden="true">+ {MEAL.name} · {TOTAL} kcal</m.p>
      </div>
    </figure>
  )
}

function MovingItem({ item, index, progress }: { item: MealItem; index: number; progress: MotionValue<number> }) {
  const start = 0.18 + index * 0.07
  const x = useTransform(progress, [start, start + 0.16], [-320, 0])
  const opacity = useTransform(progress, [start, start + 0.08], [0, 1])
  return <m.li style={{ x, opacity }}><span>{item.label}</span><span className="tabular">{item.kcal} kcal</span></m.li>
}

/** Scroll-linked: the plate's foods fly into an entry, which then lands in Today. */
function PinnedSequence() {
  const section = useRef<HTMLElement>(null)
  const { scrollYProgress: progress } = useScroll({ target: section, offset: [`start ${HEADER_HEIGHT}px`, 'end end'] })
  const [phase, setPhase] = useState(0)
  useMotionValueEvent(progress, 'change', value => setPhase(value < 0.36 ? 0 : value < 0.7 ? 1 : 2))

  const plateScale = useTransform(progress, [0, 0.4], [1, 0.86])
  // The blank entry waits beside the plate, fills, then slides onto the phone as Today confirms it.
  const entryX = useTransform(progress, [0.7, 0.9], ['0%', '70%'])
  const entryScale = useTransform(progress, [0.7, 0.9], [1, 0.72])
  const kcalValue = useTransform(progress, [0.34, 0.58], [0, TOTAL])
  const kcalText = useTransform(kcalValue, value => Math.round(value))
  const proteinWidth = useTransform(progress, [0.42, 0.64], ['0%', barWidth(MEAL.protein)])
  const carbsWidth = useTransform(progress, [0.46, 0.68], ['0%', barWidth(MEAL.carbs)])
  const fatWidth = useTransform(progress, [0.5, 0.72], ['0%', barWidth(MEAL.fat)])
  const phoneY = useTransform(progress, [0.56, 0.8], ['120%', '0%'])
  const flash = useTransform(progress, [0.86, 0.94], [0, 1])
  const flashY = useTransform(progress, [0.86, 0.94], [18, 0])
  const cue = useTransform(progress, [0.3, 0.5], [1, 0])

  return (
    <section ref={section} className="wp-p2n wp-band-ink is-pinned" id="plate-to-numbers" aria-labelledby="p2n-title">
      <div className="wp-p2n-sticky">
        <div className="wp-wrap wp-p2n-inner">
          <Head phase={phase} />
          <div className="wp-p2n-grid">
            <m.div className="wp-p2n-plate" style={{ scale: plateScale }}><PlateArt meal={MEAL.id} /></m.div>
            <m.div className="wp-p2n-entry wp-nl" style={{ x: entryX, scale: entryScale }}>
              <EntryCard
                items={MEAL.items.map((item, i) => <MovingItem key={item.label} item={item} index={i} progress={progress} />)}
                kcal={<><m.span aria-hidden="true">{kcalText}</m.span><span className="sr-only">{TOTAL}</span></>}
                widths={[proteinWidth, carbsWidth, fatWidth]}
              />
            </m.div>
            <m.div className="wp-p2n-phone" style={{ y: phoneY }}><PhoneScreen flash={flash} flashY={flashY} /></m.div>
            <m.p className="wp-p2n-cue" style={{ opacity: cue }} aria-hidden="true">Keep scrolling. The entry lands in Today.</m.p>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Phones and tablets stack the story, so each part plays as it scrolls into view:
 * the plate lands, the foods fill the label and the calories count up, then the
 * entry arrives in Today.
 */
function RevealSequence() {
  const plate = useRef<HTMLDivElement>(null)
  const entry = useRef<HTMLDivElement>(null)
  const phone = useRef<HTMLDivElement>(null)
  const plateIn = useInView(plate, { once: true, amount: 0.5 })
  const entryIn = useInView(entry, { once: true, amount: 0.45 })
  const phoneIn = useInView(phone, { once: true, amount: 0.35 })
  const kcal = useCountUp(entryIn ? TOTAL : 0, 900)

  return (
    <section className="wp-p2n wp-band-ink is-static is-reveal" id="plate-to-numbers" aria-labelledby="p2n-title">
      <div className="wp-wrap wp-p2n-inner">
        <Head phase={phoneIn ? 2 : entryIn ? 1 : plateIn ? 0 : -1} />
        <div className="wp-p2n-grid">
          <div ref={plate} className={`wp-p2n-plate${plateIn ? ' is-in' : ''}`}><PlateArt meal={MEAL.id} /></div>
          <div ref={entry} className={`wp-p2n-entry wp-nl${entryIn ? ' is-in' : ''}`}>
            <EntryCard
              items={MEAL.items.map((item, i) => (
                <li key={item.label} style={{ '--i': i } as CSSProperties}><span>{item.label}</span><span className="tabular">{item.kcal} kcal</span></li>
              ))}
              kcal={<><span aria-hidden="true">{kcal}</span><span className="sr-only">{TOTAL}</span></>}
              widths={MACROS.map(macro => (entryIn ? barWidth(MEAL[macro.key]) : '0%'))}
            />
          </div>
          <div ref={phone} className={`wp-p2n-phone${phoneIn ? ' is-in' : ''}`}><PhoneScreen flash={1} /></div>
        </div>
      </div>
    </section>
  )
}

/** Reduced motion gets the finished story, laid out in order. */
function StaticSequence() {
  return (
    <section className="wp-p2n wp-band-ink is-static" id="plate-to-numbers" aria-labelledby="p2n-title">
      <div className="wp-wrap wp-p2n-inner">
        <Head phase={-1} />
        <div className="wp-p2n-grid">
          <div className="wp-p2n-plate"><PlateArt meal={MEAL.id} /></div>
          <div className="wp-p2n-entry wp-nl">
            <EntryCard
              items={MEAL.items.map(item => <li key={item.label}><span>{item.label}</span><span className="tabular">{item.kcal} kcal</span></li>)}
              kcal={TOTAL}
              widths={[barWidth(MEAL.protein), barWidth(MEAL.carbs), barWidth(MEAL.fat)]}
            />
          </div>
          <div className="wp-p2n-phone"><PhoneScreen flash={1} /></div>
        </div>
      </div>
    </section>
  )
}

export function PlateToNumbers() {
  const reduced = useReducedMotion()
  const roomy = useMediaQuery('(min-width: 1000px) and (min-height: 700px)')
  if (reduced) return <StaticSequence />
  return roomy ? <PinnedSequence /> : <RevealSequence />
}
