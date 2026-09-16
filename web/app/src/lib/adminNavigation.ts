import { useEffect, useRef } from 'react'
import { useBlocker, type Blocker, type Location } from 'react-router-dom'

export function shouldBlockAdminNavigation(
  dirty: boolean,
  current: Pick<Location, 'pathname' | 'search'>,
  next: Pick<Location, 'pathname' | 'search'>,
): boolean {
  return dirty && (current.pathname !== next.pathname || current.search !== next.search)
}

export function resolveBlockedAdminNavigation(
  state: Blocker['state'],
  confirmLeave: () => boolean,
): 'proceed' | 'reset' | 'ignore' {
  if (state !== 'blocked') return 'ignore'
  return confirmLeave() ? 'proceed' : 'reset'
}

/** Block back, forward, and in-app links before React Router unmounts the editor. */
export function useUnsavedAdminNavigation(dirty: boolean, confirmLeave: () => boolean) {
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    shouldBlockAdminNavigation(dirtyRef.current, currentLocation, nextLocation)
  ))

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (confirmLeave()) blocker.proceed()
    else blocker.reset()
  }, [blocker, confirmLeave])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])
}
