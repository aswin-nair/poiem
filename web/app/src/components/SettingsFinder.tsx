import { useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { searchSettings, settingHref } from '../lib/settingDestinations'

export function SettingsFinder() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const resultsId = useId()
  const term = query.trim().toLowerCase()
  const matches = searchSettings(term)
  const status = !term ? '' : matches.length
    ? `${matches.length} ${matches.length === 1 ? 'setting' : 'settings'} found`
    : 'No match yet. Try “dark”, “Momo” or “password”.'

  function jump(href: string) {
    setQuery('')
    navigate(href)
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
      {matches.length > 0 && <ul>{matches.map(item => <li key={item.id}>
        <Link to={settingHref(item)} onClick={event => { event.preventDefault(); jump(settingHref(item)) }}>
          <span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </li>)}</ul>}
    </div>}
  </div>
}
