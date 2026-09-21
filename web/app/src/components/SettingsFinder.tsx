import { useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Search, X } from 'lucide-react'

const DESTINATIONS = [
  { href: '/settings#you-appearance', label: 'Appearance', detail: 'Light, dark or system', words: 'theme colour color night display mode' },
  { href: '/settings?panel=profile', label: 'Profile & goals', detail: 'Your details and daily targets', words: 'name age birthday date birth gender height weight activity calorie protein carbs fat pace routine' },
  { href: '/settings?panel=preferences', label: 'Everyday preferences', detail: 'Sound, reminders and taking a break', words: 'notifications haptics vibration pause tracking support coach' },
  { href: '/settings?panel=momo', label: 'Momo', detail: 'Personality, movement and outfits', words: 'mascot hide mute quiet sound reduced motion wardrobe roast jokes companion' },
  { href: '/settings?panel=ai', label: 'AI setup', detail: 'Meal estimates and your own API key', words: 'key provider gemini openrouter model photo text api gemma' },
  { href: '/settings?panel=account', label: 'Account', detail: 'Sign-in and account access', words: 'email password google sign out logout delete' },
  { href: '/settings?panel=data', label: 'Your data', detail: 'Export, import and a fresh start', words: 'backup restore download reset clear journal privacy' },
]

export function SettingsFinder() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const resultsId = useId()
  const term = query.trim().toLowerCase()
  const matches = DESTINATIONS.filter(item => {
    const searchable = `${item.label} ${item.detail} ${item.words}`.toLowerCase()
    return term.split(/\s+/).every(word => searchable.includes(word))
  })
  const status = !term ? '' : matches.length
    ? `${matches.length} ${matches.length === 1 ? 'place' : 'places'} to look`
    : 'No match yet. Try “dark”, “Momo” or “password”.'

  function jump(href: string) {
    setQuery('')
    navigate(href)
    const hash = href.split('#')[1]
    if (!hash) return
    requestAnimationFrame(() => {
      document.getElementById(hash)?.focus({ preventScroll: true })
      document.getElementById(hash)?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  }

  return <div className="poiem-settings-finder" role="search" aria-label="Find settings" data-mascot-avoid>
    <label className="poiem-search-field">
      <Search size={20} aria-hidden="true" />
      <span className="sr-only">Find a setting</span>
      <input ref={input} type="search" value={query} placeholder="Find a setting…"
        aria-controls={term ? resultsId : undefined}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => { if (event.key === 'Escape') setQuery('') }} />
    </label>
    {query && <button type="button" className="poiem-search-clear" aria-label="Clear settings search"
      onClick={() => { setQuery(''); input.current?.focus() }}><X size={18} aria-hidden="true" /></button>}
    <p className="sr-only" role="status">{status}</p>
    {term && <div className="poiem-settings-results" id={resultsId}>
      <p className="poiem-search-status" aria-hidden="true">{status}</p>
      {matches.length > 0 && <ul>{matches.map(item => <li key={item.href}>
        <Link to={item.href} onClick={event => { event.preventDefault(); jump(item.href) }}>
          <span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </li>)}</ul>}
    </div>}
  </div>
}
