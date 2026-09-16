import { useContext, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useFeel } from '../hooks/useHaptic'
import { LogSheetOpenContext } from '../lib/logSheetOpen'
import { prefersReducedMotion } from '../lib/tokens'
import { useAnchor } from '../mascot/anchors'
import { IconHome, IconJourney, IconPlus, IconProgress, IconSettings } from './icons'

/** Long enough to see the + pop before the sheet covers it; short enough to feel instant. */
const POP_MS = 120

const TABS = [
  { to: '/', end: true, label: 'Today', Icon: IconHome },
  { to: '/progress', label: 'Insights', Icon: IconProgress },
  { to: '/discover', label: 'Saved', Icon: IconJourney },
  { to: '/settings', label: 'You', Icon: IconSettings },
] as const

export function BottomNav() {
  const feel = useFeel()
  const fabAnchor = useAnchor('fab')
  const location = useLocation()
  const navigate = useNavigate()
  const logOpen = useContext(LogSheetOpenContext) || location.pathname === '/log'
  const [pops, setPops] = useState(0)
  const opening = useRef(false)

  function openLog() {
    if (logOpen || opening.current) return
    opening.current = true
    setPops(count => count + 1)
    window.setTimeout(() => {
      opening.current = false
      navigate('/log', { state: { background: location } })
    }, prefersReducedMotion() ? 0 : POP_MS)
  }

  const tab = (item: (typeof TABS)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={'end' in item ? item.end : undefined}
      onPointerDown={() => feel('tap')}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      {({ isActive }) => (
        <span className="nav-item-inner">
          <item.Icon active={isActive} />
          <span>{item.label}</span>
        </span>
      )}
    </NavLink>
  )

  return (
    <nav className="bottom-nav-wrap" aria-label="Main">
      <div className="bottom-nav">
        {TABS.slice(0, 2).map(tab)}

        {/* Opens the log sheet over the current page; the URL is still /log.
            The + pops a little burst, then turns into an × while the sheet is open. */}
        <button
          type="button"
          data-testid="fab"
          ref={fabAnchor}
          className={`nav-fab${logOpen ? ' active' : ''}`}
          aria-label="Log a meal"
          aria-haspopup="dialog"
          aria-expanded={logOpen}
          onPointerDown={() => feel('press')}
          onClick={openLog}
        >
          <span className="nav-fab-face" aria-hidden="true"><IconPlus size={28} /></span>
          {pops > 0 && <span key={pops} className="nav-fab-burst" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
        </button>

        {TABS.slice(2).map(tab)}
      </div>
    </nav>
  )
}
