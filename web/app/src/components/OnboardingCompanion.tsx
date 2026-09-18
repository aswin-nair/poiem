import { useApp } from '../store/AppContext'
import { MomoSticker } from './MomoSticker'
import { IconCalendar, IconCheck, IconEnergy, IconMeal, IconSettings, IconShield, IconSparkles, IconSprout, IconStar, IconWalk } from './icons'
import type { Mood } from '../mascot/behaviors'
import type { MomoExpression } from '../mascot/expressions'
import type { UserProfile } from '../types'
import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { motionIdle, motionOpacity, motionSoftSpring } from '../lib/motionPresets'

const MOMENTS: Array<{ line: string; mood: Mood; pose: string; label: string; Icon: typeof IconMeal }> = [
  { line: 'Hey, I’m Momo. Let’s make this feel like you.', mood: 'cozy', pose: 'wave_at_user', label: 'A quick hello', Icon: IconCalendar },
  { line: 'A name for the food journal hall of fame.', mood: 'proud', pose: 'bow', label: 'Make it yours', Icon: IconStar },
  { line: 'Just a starting point. You’re more interesting than a number.', mood: 'cozy', pose: 'still', label: 'Your starting point', Icon: IconSettings },
  { line: 'You pick the direction. I’ll bring the tiny cheer squad.', mood: 'proud', pose: 'happy_hop', label: 'Pick your direction', Icon: IconSprout },
  { line: 'Desk days count too. Think about your ordinary week.', mood: 'curious', pose: 'stretch', label: 'Your everyday rhythm', Icon: IconWalk },
  { line: 'A little consistency beats a dramatic Monday plan.', mood: 'cozy', pose: 'wave_at_user', label: 'Find your groove', Icon: IconEnergy },
  { line: 'Made for you. Adjustable, just like your weekend plans.', mood: 'proud', pose: 'celebrate_small', label: 'Made for you', Icon: IconSparkles },
  { line: 'One real meal and my clip goes on. Leftovers are invited.', mood: 'proud', pose: 'happy_hop', label: 'Your first little win', Icon: IconMeal },
]
const CHAPTERS = [
  { label: 'Meet you', detail: 'A few details, a personal starting point.' },
  { label: 'Find your rhythm', detail: 'Your goals. Your everyday pace.' },
  { label: 'Take your first bite', detail: 'Meet your plan and log a real meal.' },
]

export function OnboardingStepBadge({ step }: { step: number }) {
  const { Icon, label } = MOMENTS[step]
  return <div className="k-setup-tag">
    <span className="k-setup-tag-icon" aria-hidden="true"><Icon size={18} /></span>
    <span>{label}</span>
    <span className="k-setup-tag-number" aria-hidden="true">{String(step + 1).padStart(2, '0')}</span>
  </div>
}

/** Momo's card beside setup. His steam follows the answers; measurements never become jokes. */
export function OnboardingCompanion({ step, error, profile }: { step: number; error: boolean; profile?: UserProfile }) {
  const { state } = useApp()
  const prefersReducedMotion = useReducedMotion()
  const moment = MOMENTS[step]
  // Only categorical choices affect the reaction; measurements never become jokes.
  const answerLine = profile && step === 3
    ? {
      lose: 'A gradual plan. I packed patience, not a stopwatch.',
      maintain: 'Steady it is. I am appointing myself captain of consistency.',
      gain: 'Your direction is set. Tiny cheer squad reporting for duty.',
    }[profile.goal]
    : profile && step === 4
      ? `Your everyday rhythm: ${profile.activityLevel === 'sedentary' ? 'desk days included. My office is this corner.' : 'noted. No superhero schedule required.'}`
      : profile && step === 5
        ? {
          light: 'One honest log. A small entrance still counts as showing up.',
          regular: 'A regular rhythm. My imaginary clipboard is ready.',
          detailed: 'Details! Finally, someone appreciates my tiny paperwork.',
        }[profile.loggingCommitment ?? 'light']
        : undefined
  const chapter = step < 3 ? 0 : step < 6 ? 1 : 2
  const answerExpression: MomoExpression | undefined = error ? 'curious'
    : step === 6 ? 'celebrating'
      : step === 7 ? 'caught_snacking'
        : profile && step === 3 ? ({ lose: 'proud', maintain: 'wink', gain: 'celebrating' } as const)[profile.goal]
          : profile && step === 4 ? ({ sedentary: 'curious', light: 'wink', moderate: 'proud', active: 'curious', veryActive: 'wink', extraActive: 'proud' } as const)[profile.activityLevel]
            : profile && step === 5 ? ({ light: 'wink', regular: 'proud', detailed: 'curious' } as const)[profile.loggingCommitment ?? 'light']
              : undefined
  const visible = state.gamification.mascotActivity !== 'off'
  const reduced = prefersReducedMotion || state.profile.mascotReducedMotion === true
  const lively = !reduced && state.gamification.mascotActivity === 'lively' && !error
  return <aside className="k-setup-companion" aria-label="Your setup journey">
    {visible && <div className="k-setup-momo">
      <m.div className="k-setup-momo-art" aria-hidden="true"
        initial={reduced ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={motionSoftSpring}>
        <m.div className="k-setup-momo-bob"
          initial={false}
          animate={lively ? { rotate: [0, 3, 0], y: [0, -3, 0] } : { rotate: 0, y: 0 }}
          transition={lively ? motionIdle : { duration: 0 }}>
          <MomoSticker mood={error ? 'curious' : moment.mood} pose={error ? 'ponder' : moment.pose} expression={answerExpression} />
        </m.div>
      </m.div>
      <div className="k-setup-momo-note">
        <p className="k-setup-momo-name">Momo <span>your food buddy</span></p>
        {!state.profile.mascotMuted && <m.p key={`${step}-${error}-${answerLine}`} className="k-setup-momo-line" {...motionOpacity}>
          {error ? 'We’ve got this. Let’s check that detail together.' : answerLine ?? moment.line}
        </m.p>}
      </div>
    </div>}
    <div className="k-setup-intro">
      <span className="k-eyebrow">Your daily Poiem</span>
      <h2>Small steps.<br /><span>A very you start.</span></h2>
    </div>
    <ol className="k-setup-chapters" aria-label="Setup chapters">
      {CHAPTERS.map((item, index) => <li key={item.label} className={index < chapter ? 'is-complete' : index === chapter ? 'is-current' : ''} aria-current={index === chapter ? 'step' : undefined}>
        <span className="k-setup-chapter-number" aria-hidden="true">{index < chapter ? <IconCheck size={18} /> : index + 1}</span>
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
        {index < chapter && <span className="sr-only">Completed</span>}
      </li>)}
    </ol>
    <p className="k-setup-draft"><IconShield size={16} /> Your setup saves on this device.</p>
  </aside>
}
