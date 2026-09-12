import { createContext } from 'react'

/**
 * True while the log sheet is open over a page. The page underneath routes
 * against the location it was opened from, so `useLocation` there still says
 * the old path; this carries the real state down to the tab bar.
 */
export const LogSheetOpenContext = createContext(false)
