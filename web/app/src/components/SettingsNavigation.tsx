import { useEffect, useRef, useState } from 'react'
import { IconCheck, IconChevronRight } from './icons'
import { PressableButton } from './PressableButton'

const SECTIONS = [
  ['you-profile', 'Profile & goals'], ['you-preferences', 'Preferences'],
  ['you-momo', 'Momo'], ['you-ai', 'AI setup'], ['you-account', 'Account'], ['you-data', 'Your data'],
] as const

export function SettingsNavigation({ hasChanges, saved, invalid, onSave }: {
  hasChanges: boolean; saved: boolean; invalid: boolean; onSave: () => void
}) {
  const toolbar = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLElement>(null)
  const [active, setActive] = useState<string>('you-profile')
  const [more, setMore] = useState(false)

  useEffect(() => {
    const container = toolbar.current
    const links = rail.current
    const shell = container?.closest<HTMLElement>('.k-you')
    if (!container || !links || !shell) return
    let frame = 0
    const sync = () => {
      frame = 0
      const height = container.getBoundingClientRect().height
      shell.style.setProperty('--you-toolbar-height', `${height}px`)
      const threshold = container.getBoundingClientRect().bottom + 40
      let current: string = SECTIONS[0][0]
      for (const [id] of SECTIONS) {
        const section = document.getElementById(id)
        if (section && section.getBoundingClientRect().top <= threshold) current = id
      }
      // Short final sections cannot always reach the toolbar's activation line.
      const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      if (atBottom) current = SECTIONS[SECTIONS.length - 1][0]
      setActive(current)
      setMore(links.scrollLeft + links.clientWidth < links.scrollWidth - 2)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync) }
    const resize = new ResizeObserver(schedule)
    resize.observe(container)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    links.addEventListener('scroll', schedule, { passive: true })
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      links.removeEventListener('scroll', schedule)
      shell.style.removeProperty('--you-toolbar-height')
    }
  }, [])

  useEffect(() => {
    const links = rail.current
    const selected = links?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!links || !selected) return
    // Scroll only the section rail, never move the page while someone is reading.
    const item = selected.getBoundingClientRect()
    const viewport = links.getBoundingClientRect()
    if (item.left < viewport.left) links.scrollLeft += item.left - viewport.left - 6
    else if (item.right > viewport.right) links.scrollLeft += item.right - viewport.right + 6
  }, [active])

  return <div ref={toolbar} className={`you-toolbar${hasChanges ? ' has-changes' : ''}`}>
    <div className="you-section-picker">
      <nav ref={rail} className="you-shortcuts" aria-label="You page sections">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{label}</a>)}
      </nav>
      {more && <button type="button" className="you-more-sections" aria-label="More settings sections"
        onClick={() => { if (rail.current) rail.current.scrollLeft += rail.current.clientWidth * .75 }}><IconChevronRight size={20} /></button>}
    </div>
    <div className="you-save-bar">
      <div className="settings-saved-banner" role="status" aria-live="polite">
        {hasChanges ? <><span className="you-unsaved-dot" aria-hidden="true" />Unsaved changes</> : <><IconCheck size={16} />{saved ? 'Settings saved' : 'All saved'}</>}
      </div>
      <PressableButton label="Save settings" variant={hasChanges ? 'primary' : 'ghost'} onClick={onSave} disabled={!hasChanges || invalid} />
      {invalid && <a className="you-save-error" href="#you-profile">Check your profile to save</a>}
    </div>
  </div>
}
