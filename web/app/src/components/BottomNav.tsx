import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useFeel } from '../hooks/useHaptic'
import { useAnchor } from '../mascot/anchors'
import { IconHome, IconJourney, IconPlus, IconProgress, IconSettings } from './icons'

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
  const logOpen = location.pathname === '/log'

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

        {/* Opens the log sheet over the current page; the URL is still /log. */}
        <button
          type="button"
          data-testid="fab"
          ref={fabAnchor}
          className={`nav-fab${logOpen ? ' active' : ''}`}
          aria-label="Log a meal"
          aria-haspopup="dialog"
          onPointerDown={() => feel('press')}
          onClick={() => {
            if (!logOpen) navigate('/log', { state: { background: location } })
          }}
        >
          <IconPlus size={26} />
        </button>

        {TABS.slice(2).map(tab)}
      </div>
    </nav>
  )
}
