import { useCallback, useEffect } from 'react'
import { useBlocker, type BlockerFunction } from 'react-router-dom'
import { shouldProtectSettingsDeparture } from '../lib/settingsDeparture'

/** Keep the router's blocked transaction so POP, state and replace survive a decision. */
export function useSettingsDeparture(dirty: boolean) {
  const shouldBlock = useCallback<BlockerFunction>(({ currentLocation, nextLocation }) =>
    shouldProtectSettingsDeparture(dirty, currentLocation.pathname, nextLocation.pathname), [dirty])
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (!dirty) return
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      // Browsers supply their own text. The draft remains only in this mounted page.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  return blocker
}
