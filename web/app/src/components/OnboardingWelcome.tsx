import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FIRST_PIECE } from '@fud-ai/product/wardrobe'
import type { Mood } from '../mascot/behaviors'
import type { MomoExpression } from '../mascot/expressions'
import { IconChevronLeft, IconChevronRight } from './icons'
import { MomoSticker } from './MomoSticker'
import { BrandLogo } from './BrandLogo'
import { PressableButton } from './PressableButton'
import { useApp } from '../store/AppContext'
import { AppearanceControl } from './AppearanceControl'
import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { motionFade, motionOpacity, motionSoftSpring, motionStep } from '../lib/motionPresets'

/* The steam above Momo's knot is how he shows a mood. The second slide lets
   someone try four of them; none of them ever comes from food or numbers. */
const STEAM_MOODS: Array<{ id: string; label: string; expression: MomoExpression; steam: string; speech: string }> = [
  { id: 'cosy', label: 'Cosy', expression: 'neutral', steam: 'a curl', speech: 'Just simmering. Very relaxed dumpling.' },
  { id: 'happy', label: 'Happy', expression: 'happy', steam: 'a heart', speech: 'You showed up. That’s the whole trick.' },
  { id: 'curious', label: 'Curious', expression: 'curious', steam: 'a question', speech: 'What’s for lunch? Asking for me.' },
  { id: 'sleepy', label: 'Sleepy', expression: 'sleepy', steam: 'Z’s', speech: 'Five more minutes. Then breakfast.' },
]

const WELCOME_SLIDES: Array<{
  theme: 'hello' | 'steam' | 'piece'
  kicker: string
  title: [string, string]
  description: string
  speech: string
  tag: string
  mood: Mood
  pose: string
  expression: MomoExpression
}> = [
  {
    theme: 'hello',
    kicker: 'Meet your daily Poiem',
    title: ['Meet', 'Momo.'],
    description: 'Log a meal with a photo, a few words or the numbers. Momo keeps count and keeps you company.',
    speech: 'Hi. I do the counting. You do the eating.',
    tag: 'All foods welcome',
    mood: 'cozy',
    pose: 'wave_at_user',
    expression: 'happy',
  },
  {
    theme: 'steam',
    kicker: 'How Momo feels',
    title: ['Read', 'the steam.'],
    description: 'The little puff above his knot is his mood. It comes from how you use the app, never from what you eat.',
    speech: '',
    tag: '',
    mood: 'cozy',
    pose: 'still',
    expression: 'happy',
  },
  {
    theme: 'piece',
    kicker: 'Your plate. Your pace.',
    title: ['His first', 'piece.'],
    description: 'A few questions, then one real meal. Momo puts on his Blossom clip, and new pieces arrive with the days you log.',
    speech: 'I’ve been saving this clip for you.',
    tag: 'Blossom clip · his to keep',
    mood: 'proud',
    pose: 'celebrate_small',
    expression: 'proud',
  },
]

export const WELCOME_SLIDE_COUNT = WELCOME_SLIDES.length

export function OnboardingWelcome({ index, onSlideChange, onStart, signedIn }: {
  index: number
  onSlideChange: (index: number) => void
  onStart: () => void
  signedIn: boolean
}) {
  const { state } = useApp()
  const prefersReducedMotion = useReducedMotion()
  const reducedDecorations = prefersReducedMotion || state.profile.mascotReducedMotion === true
  const [moodId, setMoodId] = useState('happy')
  const slide = WELCOME_SLIDES[index] ?? WELCOME_SLIDES[0]
  const steamMood = STEAM_MOODS.find(mood => mood.id === moodId) ?? STEAM_MOODS[1]
  const onSteam = slide.theme === 'steam'
  const showMomo = state.gamification.mascotActivity !== 'off'
  const speech = onSteam ? steamMood.speech : slide.speech
  const tag = onSteam ? `Steam: ${steamMood.steam}` : slide.tag

  return (
    <m.main className={`k-screen k-intro is-${slide.theme}`} aria-label="Welcome to Poiem"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={motionFade}>
      <header className="k-intro-bar">
        <span className="welcome-brand"><BrandLogo /></span>
        <AppearanceControl compact />
      </header>

      <div className="k-intro-layout">
        {showMomo && <div className="k-intro-stage" aria-hidden="true">
          {!state.profile.mascotMuted && <m.p key={speech} className="k-intro-speech" {...motionOpacity}>{speech}</m.p>}
          <m.div key={`${slide.theme}-${onSteam ? moodId : ''}`} className="k-intro-momo"
            initial={reducedDecorations ? false : { opacity: 0, scale: .86, y: 18, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }} transition={motionSoftSpring}>
            <MomoSticker mood={slide.mood} pose={slide.pose}
              expression={onSteam ? steamMood.expression : slide.expression}
              outfit={slide.theme === 'piece' ? { head: FIRST_PIECE } : {}} />
          </m.div>
          {tag && <span className="k-intro-tag">{tag}</span>}
        </div>}

        <section className="k-intro-copy" aria-labelledby="welcome-heading">
          <div aria-live="polite" aria-atomic="true">
            <m.div key={slide.theme} className="k-intro-text" {...(prefersReducedMotion ? motionOpacity : motionStep)}>
              <p className="k-eyebrow"><span aria-hidden="true">0{index + 1}</span>{slide.kicker}</p>
              <h1 className="k-intro-title" id="welcome-heading"><span>{slide.title[0]}</span>{' '}<span>{slide.title[1]}</span></h1>
              <p className="k-intro-sub">{slide.description}</p>
            </m.div>
          </div>

          {onSteam && <div className="k-intro-moods" role="group" aria-label="Try Momo’s moods">
            {STEAM_MOODS.map(mood => (
              <button key={mood.id} type="button" className={`k-chip is-${mood.id}`} aria-pressed={mood.id === moodId}
                onClick={() => setMoodId(mood.id)}>{mood.label}</button>
            ))}
          </div>}

          <nav className="k-intro-nav" aria-label="Introduction slides">
            <div className="k-intro-dots">
              {WELCOME_SLIDES.map((item, slideIndex) => (
                <button
                  key={item.theme}
                  type="button"
                  className="k-intro-dot"
                  aria-label={`Go to slide ${slideIndex + 1}: ${item.title.join(' ')}`}
                  aria-current={slideIndex === index ? 'step' : undefined}
                  onClick={() => onSlideChange(slideIndex)}
                ><span aria-hidden="true">{slideIndex + 1}</span></button>
              ))}
            </div>
            <div className="k-intro-arrows">
              <button type="button" className="k-icon-button" aria-label="Previous introduction" disabled={index === 0}
                onClick={() => onSlideChange(Math.max(0, index - 1))}>
                <IconChevronLeft size={20} />
              </button>
              <button type="button" className="k-icon-button" aria-label="Next introduction" disabled={index === WELCOME_SLIDE_COUNT - 1}
                onClick={() => onSlideChange(Math.min(WELCOME_SLIDE_COUNT - 1, index + 1))}>
                <IconChevronRight size={20} />
              </button>
            </div>
          </nav>

          <div className="k-intro-actions">
            <PressableButton fullWidth onClick={onStart}>
              Get started <IconChevronRight size={19} />
            </PressableButton>
            <p className="k-intro-note">A few questions, your starting guide, then your first meal.</p>
            {!signedIn && (
              <Link to="/login" className="k-intro-signin">
                Already have an account? <strong>Sign in</strong>
              </Link>
            )}
          </div>
        </section>
      </div>
    </m.main>
  )
}
