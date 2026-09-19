import type { Page } from '@playwright/test'
import { VISUAL_NOW, VISUAL_USER, visualSeedState } from '../src/lib/visualSeed'

export { VISUAL_DAY, VISUAL_NOW, VISUAL_USER, VISUAL_USER_ID, visualSeedState } from '../src/lib/visualSeed'

/** Keep this string in sync with `AUTH_SESSION_STORAGE_KEY` in `src/lib/auth.ts`. */
const AUTH_SESSION_STORAGE_KEY = 'fud-ai-auth-session'

export async function applyVisualSeed(page: Page): Promise<void> {
  const user = VISUAL_USER
  const state = visualSeedState()
  await page.addInitScript(({ user, state, sessionKey }) => {
    window.__POIEM_TEST__ = { rng: () => 0.5, hideOverlay: true }
    try {
      sessionStorage.setItem('poiem-splash-seen', '1')
      localStorage.setItem(sessionKey, JSON.stringify(user))
      localStorage.setItem(`fud-ai-web-state-${user.sub}`, JSON.stringify(state))
    } catch { /* private mode */ }
  }, { user, state, sessionKey: AUTH_SESSION_STORAGE_KEY })
  await page.clock.install({ time: new Date(VISUAL_NOW) })
}
