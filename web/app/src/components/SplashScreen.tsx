import { BrandLogo } from './BrandLogo'
import identity from '../brand/identity.json'

const RADIUS = 54
const CIRC = 2 * Math.PI * RADIUS

interface SplashScreenProps {
  /** When true, plays the fade/scale-out transition before the parent unmounts this component. */
  exiting?: boolean
  /** After the first open in a session: stays invisible unless loading takes a noticeable moment. */
  quiet?: boolean
}

export function SplashScreen({ exiting = false, quiet = false }: SplashScreenProps) {
  return (
    <div
      className={`splash-screen${exiting ? ' splash-exit' : ''}${quiet ? ' is-quiet' : ''}`}
      role="status"
      aria-label="Loading Poiem"
    >
      <div className="splash-ring-wrap">
        <svg className="splash-ring-svg" viewBox="0 0 128 128" aria-hidden>
          <defs>
            <linearGradient id="splash-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--coral-start)" />
              <stop offset="100%" stopColor="var(--coral-end)" />
            </linearGradient>
          </defs>
          <circle
            cx="64" cy="64" r={RADIUS}
            fill="none"
            stroke="rgba(255,122,80,0.14)"
            strokeWidth="6"
          />
          <circle
            className="splash-ring-progress"
            cx="64" cy="64" r={RADIUS}
            fill="none"
            stroke="url(#splash-ring-grad)"
            strokeWidth="6"
            strokeLinecap="round"
            style={{ '--circ': CIRC } as React.CSSProperties}
          />
        </svg>
        <BrandLogo variant="mark" decorative />
      </div>

      <div className="splash-wordmark"><BrandLogo decorative /></div>
      <div className="splash-tagline">{identity.tagline}</div>
    </div>
  )
}
