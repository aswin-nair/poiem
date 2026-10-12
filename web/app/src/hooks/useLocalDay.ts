import { useEffect, useState } from 'react'
import { localDayKey, msUntilNextLocalDay } from '../lib/dates'

/**
 * The current local calendar day (YYYY-MM-DD), kept honest for a tab that
 * outlives midnight: it advances at local midnight and again whenever the tab
 * is shown or focused, since a background timer can be throttled or paused.
 */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => localDayKey(new Date()))

  useEffect(() => {
    let timer: number | undefined
    const sync = () => {
      const next = localDayKey(new Date())
      setDay(current => (current === next ? current : next))
    }
    const schedule = () => {
      window.clearTimeout(timer)
      // A moment past midnight, so the timer cannot fire a hair early and see the same day.
      timer = window.setTimeout(() => { sync(); schedule() }, msUntilNextLocalDay(new Date()) + 50)
    }
    const wake = () => { sync(); schedule() }
    const visible = () => { if (document.visibilityState === 'visible') wake() }

    schedule()
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])

  return day
}
