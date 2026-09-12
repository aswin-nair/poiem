import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, Plus } from 'lucide-react'
import { AppearanceToggle } from '../components/AppearanceToggle'
import { BrandLogo } from '../components/BrandLogo'
import { Momo } from '../components/Momo'
import { useAuth } from '../store/AuthContext'
import { PlateArt } from './welcome/PlateArt'
import { PlateToNumbers } from './welcome/PlateToNumbers'
import { PoiemFacts } from './welcome/PoiemFacts'
import { ScanPanel } from './welcome/ScanPanel'
import { SectionHead } from './welcome/SectionHead'
import { useCutNavigation } from './welcome/useCutNavigation'
import { WeekBlocks } from './welcome/WeekBlocks'
import { MomoAside } from './welcome/MomoAside'
import { FoodTicker } from './welcome/FoodTicker'
import '../styles/welcome-poster.css'
import '../styles/welcome-details.css'
import '../styles/welcome-motion.css'

const STEPS = [
  { number: '01', title: 'Snap or describe', shot: 'log', caption: 'Fig. 02 — Log', text: 'Take a photo, describe what you ate, or enter the numbers yourself.', alt: 'The Poiem log screen with photo, describe and manual entry options' },
  { number: '02', title: 'Check the estimate', shot: 'edit', caption: 'Fig. 03 — Edit', text: 'Every estimate is a starting point. Adjust the name, calories and macros before you save.', alt: 'Editing the calories and macros of a logged meal in Poiem' },
  { number: '03', title: 'See the pattern', shot: 'insights', caption: 'Fig. 04 — Insights', text: 'Insights show your routine over time, and breaks never reset your milestones.', alt: 'Poiem Insights with logged-day milestones' },
  { number: '04', title: 'Repeat your usuals', shot: 'saved', caption: 'Fig. 05 — Saved', text: 'Save the meals you eat often and log them again in a tap.', alt: 'Saved meals in Poiem, ready to log again' },
] as const

const FAQS = [
  ['Do I have to log every single bite?', 'No. Poiem is a journal, not a rulebook. Use it at a pace that helps you, and come back whenever you want.'],
  ['Are the AI numbers exact?', 'No. Photo and text analysis produce estimates, and portions matter. Review and adjust entries before saving, or log food manually.'],
  ['Can I sign up with Google?', 'Yes. Choose Start your journal, then continue with Google. Email signup is available too. You set up your profile after signing in.'],
  ['Is this medical advice?', 'No. Poiem is a food-tracking tool for adults, not a medical service. For personal nutrition or medical advice, speak with a qualified professional.'],
] as const

function productPath(path: string): string {
  return import.meta.env.PROD ? `/app${path}` : path
}

function screenUrl(name: string): string {
  return `${import.meta.env.BASE_URL}showcase/${name}.jpg`
}

function Figure({ shot, caption, alt }: { shot: string; caption: string; alt: string }) {
  return (
    <figure className="wp-figure">
      <figcaption className="wp-figure-bar"><span>{caption}</span><span>App screen</span></figcaption>
      <img src={screenUrl(shot)} alt={alt} width={390} height={844} loading="lazy" decoding="async" />
    </figure>
  )
}

/** The sticky header tightens once the page has scrolled. */
function useCondensedHeader(): boolean {
  const [condensed, setCondensed] = useState(false)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setCondensed(window.scrollY > 24)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  return condensed
}

/** The step nearest the middle of the viewport drives the pinned screen; the last one stays under the wipe. */
function useActiveStep() {
  const [state, setState] = useState({ active: 0, previous: -1 })
  const steps = useRef<(HTMLElement | null)[]>([])
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const next = Number((entry.target as HTMLElement).dataset.step ?? 0)
        setState(current => current.active === next ? current : { active: next, previous: current.active })
      }
    }, { rootMargin: '-45% 0px -45% 0px' })
    for (const step of steps.current) if (step) observer.observe(step)
    return () => observer.disconnect()
  }, [])
  return { ...state, steps }
}

export default function WelcomePage() {
  const { user } = useAuth()
  const condensed = useCondensedHeader()
  const { active, previous, steps } = useActiveStep()
  const { cutting, onNavigate } = useCutNavigation()
  const [motionPaused, setMotionPaused] = useState(false)
  const home = import.meta.env.PROD ? '/' : '/welcome'
  const destination = user ? productPath('/') : productPath('/login?mode=signup')
  const signInDestination = user ? productPath('/') : productPath('/login?mode=signin')
  const cta = user ? 'Open my journal' : 'Start your journal'

  return (
    <div className={`welcome-poster${motionPaused ? ' wp-motion-paused' : ''}`}>
      <a className="wp-skip" href="#welcome-content">Skip to content</a>
      <header className={`wp-header${condensed ? ' is-condensed' : ''}`}>
        <div className="wp-header-inner">
          <Link className="wp-brand" to={home} aria-label="Poiem home"><BrandLogo /></Link>
          <nav className="wp-nav-links" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#week">Your week</a>
            <a href="#principles">Principles</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="wp-header-actions">
            <AppearanceToggle />
            {!user && <a className="wp-header-link" href={signInDestination} onClick={onNavigate}>Sign in</a>}
            <a className="wp-btn wp-btn-primary wp-btn-sm" href={destination} onClick={onNavigate}>{user ? 'My journal' : 'Start'}<ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </header>

      <main id="welcome-content">
        <section className="wp-hero" aria-labelledby="welcome-title">
          <div className="wp-hero-grid">
            <div className="wp-hero-copy">
              <p className="wp-meta-row"><span>Poiem — food journal</span><span>Calories · macros · no guilt</span></p>
              <h1 id="welcome-title" className="wp-hero-title">
                <span className="wp-hero-small">A little tracking.</span>{' '}
                <span className="wp-hero-big"><span>A lot of</span>{' '}<span className="wp-mark">living.<svg className="wp-hero-doodle" viewBox="0 0 100 100" aria-hidden="true"><path d="M18 75Q53 70 72 22M49 30l25-12 7 28M20 24l9 12M8 46l16 3M47 7l-1 15" /></svg></span></span>
              </h1>
              <p className="wp-hero-intro">Snap, describe or type what you ate. Poiem estimates the calories and macros, you check the numbers, and your day carries on.</p>
              <div className="wp-actions">
                <a className="wp-btn wp-btn-primary" href={destination} onClick={onNavigate}>{cta}<ArrowRight size={18} aria-hidden="true" /></a>
                <a className="wp-btn wp-btn-ghost" href="#plate-to-numbers">See it work<ArrowDown size={18} aria-hidden="true" /></a>
              </div>
              <MomoAside />
            </div>
            <div className="wp-hero-scan"><ScanPanel /></div>
          </div>
        </section>

        <FoodTicker paused={motionPaused} onToggle={() => setMotionPaused(value => !value)} />

        <PlateToNumbers />

        <section className="wp-section" id="how-it-works" aria-labelledby="how-title">
          <div className="wp-wrap">
            <SectionHead index="02" label="How it works" titleId="how-title" title={<>Four steps.<br /><span>Zero homework.</span></>} note="Real screens from the Poiem app" />
            <div className="wp-steps-grid">
              <ol className="wp-steps">
                {STEPS.map((step, index) => (
                  <li
                    key={step.number}
                    ref={element => { steps.current[index] = element }}
                    data-step={index}
                    className={`wp-step${index === active ? ' is-active' : ''}`}
                  >
                    <span className="wp-step-num">{step.number}</span>
                    <div className="wp-step-body">
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                      <div className="wp-step-figure"><Figure shot={step.shot} caption={step.caption} alt={step.alt} /></div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="wp-steps-stage">
                <figure className="wp-figure">
                  <figcaption className="wp-figure-bar"><span>{STEPS[active].caption}</span><span>App screen</span></figcaption>
                  <div className="wp-stage-screens">
                    {STEPS.map((step, index) => (
                      <img
                        key={step.shot}
                        src={screenUrl(step.shot)}
                        alt={index === active ? step.alt : ''}
                        aria-hidden={index !== active}
                        data-state={index === active ? 'active' : index === previous ? 'previous' : 'idle'}
                        width={390}
                        height={844}
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                  </div>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <WeekBlocks />

        <PoiemFacts />

        <section className="wp-section" id="faq" aria-labelledby="faq-title">
          <div className="wp-wrap wp-faq-grid">
            <div className="wp-faq-head">
              <p className="wp-label">[05] FAQ</p>
              <h2 id="faq-title">Good<br /><span>questions.</span></h2>
            </div>
            <div className="wp-faq">
              {FAQS.map(([question, answer], index) => (
                <details key={question}>
                  <summary>
                    <span className="wp-faq-index">Q.0{index + 1}</span>
                    <span className="wp-faq-question">{question}</span>
                    <span className="wp-faq-toggle" aria-hidden="true"><Plus size={20} /></span>
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="wp-section wp-band-ink wp-final" aria-labelledby="final-title">
          <div className="wp-wrap wp-final-grid">
            <div className="wp-final-copy">
              <p className="wp-label">[06] Start</p>
              <h2 id="final-title" className="wp-stack"><span>Your journal is</span>{' '}<span className="wp-mark">one meal away.</span></h2>
              <div className="wp-actions">
                <a className="wp-btn wp-btn-primary" href={destination} onClick={onNavigate}>{cta}<ArrowRight size={18} aria-hidden="true" /></a>
                {!user && <a className="wp-btn wp-btn-ghost" href={signInDestination} onClick={onNavigate}>I have an account</a>}
              </div>
            </div>
            <figure className="wp-final-art">
              <div className="wp-final-plate"><PlateArt meal="bowl" /></div>
              <figcaption className="wp-final-stamp">
                <span className="wp-final-momo" aria-hidden="true"><Momo expression="proud" pose="still" /></span>
                <span>Momo<br />Optional companion</span>
              </figcaption>
            </figure>
          </div>
          <p className="wp-wordmark" aria-hidden="true">Poiem</p>
        </section>
      </main>

      <footer className="wp-footer">
        <div className="wp-footer-grid">
          <div className="wp-footer-brand"><BrandLogo /><p>A little tracking. A lot of living.</p></div>
          <nav aria-label="Product">
            <p className="wp-label">Product</p>
            <a href="#how-it-works">How it works</a>
            <a href="#week">Your week</a>
            <a href="#principles">Principles</a>
            <a href="#faq">FAQ</a>
          </nav>
          <nav aria-label="Account">
            <p className="wp-label">Account</p>
            <a href={destination} onClick={onNavigate}>{cta}</a>
            {!user && <a href={signInDestination} onClick={onNavigate}>Sign in</a>}
            {/* About and Support live inside the signed-in app; guests would only be redirected. */}
            {user && <a href={productPath('/about')} onClick={onNavigate}>About</a>}
            {user && <a href={productPath('/support')} onClick={onNavigate}>Support</a>}
          </nav>
        </div>
        <p className="wp-footer-legal">© {new Date().getFullYear()} Poiem — A food journal for adults. Not medical advice.</p>
      </footer>

      <div className={`wp-cut${cutting ? ' is-cutting' : ''}`} aria-hidden="true"><span>Poiem</span></div>
    </div>
  )
}
