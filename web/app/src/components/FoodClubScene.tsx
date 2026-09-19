import { Camera, Check, Flame, Utensils } from 'lucide-react'
import { MotionConfig, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { useApp } from '../store/AppContext'
import { bubblePop, motionSoftSpring, stickerDrop } from '../lib/motionPresets'
import { MomoSticker } from './MomoSticker'

/** The account screen's poster: the brand line, Momo reacting to the form, and an example meal. Example values are never user data. */
export function FoodClubScene({ privateFocus, loading, error, returning }: {
  privateFocus: boolean; loading: boolean; error: boolean; returning: boolean
}) {
  const { state } = useApp()
  const reduced = useReducedMotion() || state.profile.mascotReducedMotion
  const visible = state.gamification.mascotActivity !== 'off'
  // Keep the poster readable even if the optional animation chunk cannot load.
  const stickerEntrance = { ...stickerDrop, initial: reduced ? false as const : { opacity: 1, y: 10, rotate: -3, scale: .97 } }
  const speechEntrance = { ...bubblePop, initial: reduced ? false as const : { opacity: 1, scale: .97, y: 4 } }
  const line = privateFocus ? 'Eyes closed. Your password is your business.'
    : loading ? 'Setting your place at the table…'
      : error ? 'Tiny hiccup. Let’s try that again.'
        : returning ? 'Your plate called. It missed you.' : 'You bring the appetite. I bring the maths.'

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <aside className={`k-account-poster${returning ? ' is-returning' : ''}`} aria-label="Meet your food sidekick">
        <p className="k-eyebrow">The everyday appetite</p>
        <h2 className="k-account-headline"><span>Eat.</span>{' '}<span>Log.</span>{' '}<span>Live.</span></h2>
        <div className="k-account-stage" aria-hidden="true">
          <div className="food-club-momo k-account-momo">
            {visible ? <m.div className="k-account-momo-art" initial={false}
              animate={{ rotate: privateFocus ? -5 : error ? 4 : 0, y: loading ? -5 : 0 }}
              transition={motionSoftSpring}>
              <MomoSticker mood={privateFocus ? 'sleepy' : error || loading ? 'curious' : 'excited'} pose={loading ? 'ponder' : 'still'}
                expression={privateFocus ? 'sleepy' : error ? 'skeptical' : loading ? 'curious' : returning ? 'proud' : 'celebrating'} />
            </m.div> : <Utensils className="food-club-fallback" size={64} strokeWidth={1.6} />}
          </div>
          <m.div className="k-account-receipt" {...stickerEntrance}>
            <span className="k-account-receipt-top"><Camera size={15} /> On the menu <Check size={15} /></span>
            <strong>Yogurt &amp; berries</strong>
            <span className="k-account-receipt-kcal"><Flame size={16} /><b>320</b> kcal <small>example meal</small></span>
          </m.div>
        </div>
        {visible && !state.profile.mascotMuted && <div className="food-club-bubble-wrap k-account-bubble">
          <span className="k-eyebrow">Momo says</span>
          <m.p key={line} {...speechEntrance}>{line}</m.p>
        </div>}
        <p className="k-account-description"><strong>A food journal with an appetite for life.</strong> Track calories and macros with a photo or a few words. Then get on with the good stuff.</p>
      </aside>
    </MotionConfig>
  )
}
