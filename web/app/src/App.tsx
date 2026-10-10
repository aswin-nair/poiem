import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { BrandLogo } from './components/BrandLogo'
import identity from './brand/identity.json'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Navigate, Route, RouterProvider, Routes, createBrowserRouter, useLocation, type Location } from 'react-router-dom'
import { googleClientId, isGoogleAuthConfigured } from './lib/auth'
import { guestUserId, hasSeenAccount } from './lib/guestMode'
import { AuthProvider, useAuth } from './store/AuthContext'
import { AppProvider, useApp } from './store/AppContext'
import { ToastProvider } from './components/Toast'
import { HomePage } from './pages/HomePage'
import { AppShell as WorkspaceShell } from './components/system/AppShell'
import { BottomNav } from './components/BottomNav'
import { WorkspaceRouteRecovery } from './components/WorkspaceRouteRecovery'
import { LogSheet } from './pages/LogSheet'
import { LogSheetOpenContext } from './lib/logSheetOpen'
import { LogTextPage } from './pages/LogTextPage'
import { PhotoLogPage } from './pages/PhotoLogPage'
import { ReviewFoodPage } from './pages/ReviewFoodPage'
import { ManualEntryPage } from './pages/ManualEntryPage'
import { EditFoodPage } from './pages/EditFoodPage'
import { AnchorProvider } from './mascot/anchors'
import { MascotOverlay } from './mascot/MascotOverlay'
import { MomoInterludeGate } from './components/MomoInterludeGate'
import { ActionPlay } from './components/ActionPlay'
import { useNavDirection } from './hooks/useNavDirection'
import { LazyMotion, MotionConfig } from 'motion/react'
import { getSessionReturnLabel, rememberSessionNavigation, safeSessionDestination, takeSessionReturn, type SessionDestination } from './lib/sessionNavigation'
import { hydrateLogDrafts } from './lib/logDrafts'
import { handoffGuestSetupDraft } from './lib/setupDraftHandoff'
import { findSettingDestination } from './lib/settingDestinations'

const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const JourneyPage = lazy(() => import('./pages/JourneyPage'))
const ComponentSheetPage = lazy(() => import('./pages/ComponentSheetPage'))
// Screens most visits never open load on demand: the first run, the account screens and Coach.
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(module => ({ default: module.OnboardingPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })))
const CoachPage = lazy(() => import('./pages/CoachPage').then(module => ({ default: module.CoachPage })))
// Keep the everyday secondary screens out of the first Today download.
const SavedMealsPage = lazy(() => import('./pages/SavedMealsPage').then(module => ({ default: module.SavedMealsPage })))
const ProgressPage = lazy(() => import('./pages/ProgressPage').then(module => ({ default: module.ProgressPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })))

function PageFallback() {
  return <main className="app-main"><p role="status">Opening…</p></main>
}

function WorkspaceFallback() {
  return <WorkspaceShell screen="k-page" nav={<BottomNav />}>
    <main className="app-main k-page-main" aria-busy="true"><p role="status">Opening…</p></main>
  </WorkspaceShell>
}

/** Client-side navigation keeps the browser's scroll offset by default; land each new page at the top. */
function ScrollToTop() {
  const { pathname, search, hash, state } = useLocation()
  const sheetBackground = useRef<string | null>(null)
  useEffect(() => {
    const title = isWelcomeSurface(pathname) ? 'A little tracking. A lot of living.'
      : pathname === '/login' && new URLSearchParams(search).get('mode') === 'signup' ? 'Sign up'
        : routeTitle(pathname)
    document.title = `${title} · ${identity.name}`
  }, [pathname, search])

  useEffect(() => {
    // The log sheet opens over the page underneath and moves focus into itself.
    // Opening it, or closing it back to that same page, keeps the scroll position.
    const routeState = state as { background?: { pathname: string }; justLogged?: unknown } | null
    if (pathname === '/log') {
      sheetBackground.current = routeState?.background?.pathname ?? null
      if (!routeState?.background) window.scrollTo(0, 0)
      return
    }
    const returnedFromSheet = sheetBackground.current === pathname && !routeState?.justLogged
    sheetBackground.current = null
    if (returnedFromSheet) return
    window.scrollTo(0, 0)
    // Route chunks can arrive after a slow network request. Observe their actual
    // mount instead of giving up after a fixed number of animation frames.
    // Settings owns focus when a direct link names one of its controls.
    const setting = pathname === '/settings' ? findSettingDestination(hash) : undefined
    if (setting && (setting.panel ?? null) === new URLSearchParams(search).get('panel')) return
    let frame = 0
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>('main h1, .app-shell header h1')
      if (heading && heading.getClientRects().length) {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
        observer.disconnect()
      }
    }
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(focusHeading)
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden'] })
    frame = window.requestAnimationFrame(focusHeading)
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame) }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function routeTitle(pathname: string): string {
  if (pathname === '/') return 'Today'
  if (pathname === '/progress') return 'Insights'
  if (pathname === '/discover' || pathname === '/log/saved') return 'Saved'
  if (pathname === '/settings') return 'You'
  if (pathname.startsWith('/log/photo')) return 'Photo log'
  if (pathname.startsWith('/log/text')) return 'Describe a meal'
  if (pathname.startsWith('/log/manual')) return 'Manual log'
  if (pathname === '/log') return 'Log a meal'
  if (pathname === '/review') return 'Review meal'
  if (pathname.startsWith('/edit/')) return 'Edit meal'
  if (pathname === '/coach') return 'AI Coach'
  if (pathname === '/support') return 'Support'
  if (pathname === '/admin') return 'Managed AI admin'
  if (pathname === '/about') return 'About'
  if (pathname === '/onboarding') return 'Get started'
  if (pathname === '/login') return 'Sign in'
  if (pathname === '/forgot-password') return 'Forgot password'
  if (pathname === '/reset-password') return 'Reset password'
  return identity.name
}

function routerBasename(): string | undefined {
  if (typeof window !== 'undefined' && /^\/app(?:\/|$)/.test(window.location.pathname)) return '/app'
  return undefined
}

/**
 * The public welcome page lives at `/welcome` everywhere, and at `/` in production builds, where
 * the product is served under `/app`. The dev server has no `/app` prefix, so its `/` stays Today.
 */
function isWelcomeSurface(pathname: string): boolean {
  if (typeof window !== 'undefined' && /^\/app(?:\/|$)/.test(window.location.pathname)) return false
  return pathname === '/welcome' || (import.meta.env.PROD && pathname === '/')
}

/** Keep the public brand surface outside the authenticated product shell. */
function RootSurface() {
  const location = useLocation()
  if (isWelcomeSurface(location.pathname)) {
    return <Suspense fallback={<main><p>Opening Poiem…</p></main>}><WelcomePage /></Suspense>
  }
  return <AppGate />
}

/**
 * Carries the navigation direction down to the page as a class, so a screen
 * can slide in from the side the user came from. `display: contents` keeps the
 * wrapper out of layout entirely.
 */
function DirectionalRoutes({ children, hold = false }: { children: ReactNode; hold?: boolean }) {
  const direction = useNavDirection()
  // Opening or closing the log sheet is not a page change; keep the entrance class so the page doesn't replay it.
  const [shown, setShown] = useState(direction)
  if (!hold && shown !== direction) setShown(direction)
  return <div className={`nav-dir nav-dir-${shown}`}>{children}</div>
}

function AuthenticatedRoutes() {
  const { state } = useApp()
  const location = useLocation()
  const background = (location.state as { background?: Location } | null)?.background
  const logSheetOpen = location.pathname === '/log'
  // The page under the sheet stays put while it opens and when it closes back onto that page.
  const [route, setRoute] = useState({ path: location.pathname, under: background?.pathname ?? null, hold: false })
  if (route.path !== location.pathname) {
    setRoute({
      path: location.pathname,
      under: logSheetOpen ? background?.pathname ?? null : null,
      hold: (logSheetOpen && Boolean(background)) || route.under === location.pathname,
    })
  }

  if (!state.onboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Suspense fallback={<PageFallback />}><OnboardingPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <LogSheetOpenContext.Provider value={logSheetOpen}>
    <AnchorProvider>
    <MascotOverlay />
    <MomoInterludeGate />
    <DirectionalRoutes hold={route.hold}>
    <Routes location={logSheetOpen && background ? background : location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/progress" element={<WorkspaceRouteRecovery><Suspense fallback={<WorkspaceFallback />}><ProgressPage /></Suspense></WorkspaceRouteRecovery>} />
      <Route path="/coach" element={<Suspense fallback={<PageFallback />}><CoachPage /></Suspense>} />
      {/* Opened directly, the log sheet sits over Today. */}
      <Route path="/log" element={<HomePage />} />
      <Route path="/log/text" element={<LogTextPage />} />
      <Route path="/log/photo" element={<PhotoLogPage />} />
      <Route path="/log/saved" element={<WorkspaceRouteRecovery><Suspense fallback={<WorkspaceFallback />}><SavedMealsPage /></Suspense></WorkspaceRouteRecovery>} />
      <Route path="/discover" element={<WorkspaceRouteRecovery><Suspense fallback={<WorkspaceFallback />}><SavedMealsPage /></Suspense></WorkspaceRouteRecovery>} />
      <Route path="/log/manual" element={<ManualEntryPage />} />
      <Route path="/review" element={<ReviewFoodPage />} />
      <Route path="/edit/:id" element={<EditFoodPage />} />
      <Route path="/settings" element={<WorkspaceRouteRecovery><Suspense fallback={<WorkspaceFallback />}><SettingsPage /></Suspense></WorkspaceRouteRecovery>} />
      <Route path="/about" element={<Suspense fallback={<PageFallback />}><AboutPage /></Suspense>} />
      <Route path="/support" element={<Suspense fallback={<PageFallback />}><SupportPage /></Suspense>} />
      <Route path="/admin" element={<Suspense fallback={<PageFallback />}><AdminPage /></Suspense>} />
      <Route path="/journey" element={<Suspense fallback={<PageFallback />}><JourneyPage /></Suspense>} />
      {import.meta.env.DEV && <Route path="/dev/components" element={<Suspense fallback={<PageFallback />}><ComponentSheetPage /></Suspense>} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </DirectionalRoutes>
    {logSheetOpen && <LogSheet />}
    </AnchorProvider>
    </LogSheetOpenContext.Provider>
  )
}

function GuestRoutes() {
  const { state } = useApp()

  if (!state.onboarded || getSessionReturnLabel()) {
    // A device that has held an account belongs to someone coming back, not to a
    // first-time visitor. Sending them to onboarding would make them rebuild a
    // profile they already have, so the fallback becomes the login screen —
    // which also covers session expiry, not just an explicit sign-out.
    const fallback = getSessionReturnLabel() || hasSeenAccount() ? '/login' : '/onboarding'
    return (
      <AnchorProvider>
        <MascotOverlay />
        <Routes>
          <Route path="/onboarding" element={<Suspense fallback={<PageFallback />}><OnboardingPage /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPage /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<PageFallback />}><ForgotPasswordPage /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPasswordPage /></Suspense>} />
          <Route path="*" element={<Navigate to={fallback} replace />} />
        </Routes>
      </AnchorProvider>
    )
  }

  return (
    <AnchorProvider>
      <MascotOverlay />
      <Routes>
        <Route path="/" element={<HomePage guest />} />
        <Route path="/login" element={<Suspense fallback={<PageFallback />}><LoginPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<PageFallback />}><ForgotPasswordPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPasswordPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnchorProvider>
  )
}

/** Account hydration finishes before this mounts. Draft hydration must also finish before a review can return. */
function AccountEntryRoutes() {
  const { user } = useAuth()
  const { state } = useApp()
  const location = useLocation()
  const [entry, setEntry] = useState<{ ready: boolean; destination: SessionDestination | null }>({ ready: false, destination: null })
  useEffect(() => {
    let cancelled = false
    void hydrateLogDrafts(user!.sub).then(drafts => {
      if (cancelled) return
      const setupHandoff = location.pathname === '/login' && new URLSearchParams(location.search).get('setup') === '1'
      if (setupHandoff && !state.onboarded) handoffGuestSetupDraft(guestUserId(), user!.sub, state.onboarded, state.profile)
      let destination = takeSessionReturn(user!.sub)
      if (destination?.pathname === '/review' && !drafts.review) destination = { ...destination, pathname: '/log', search: '' }
      if (destination?.pathname.startsWith('/edit/') && !state.foodEntries.some(food => food.id === destination!.pathname.slice(6))) {
        destination = { pathname: '/', search: '' }
      }
      setEntry({ ready: true, destination })
    }).catch(() => {
      if (!cancelled) {
        takeSessionReturn(user!.sub)
        setEntry({ ready: true, destination: null })
      }
    })
    return () => { cancelled = true }
    // This provider mounts once per account, after its account snapshot is known.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (entry.destination && location.pathname === entry.destination.pathname && location.search === entry.destination.search) {
      setEntry(current => ({ ...current, destination: null }))
    }
  }, [entry.destination, location.pathname, location.search])
  if (!entry.ready) return <PageFallback />
  if (entry.destination && (location.pathname !== entry.destination.pathname || location.search !== entry.destination.search)) {
    return <Navigate to={entry.destination.pathname + entry.destination.search} state={entry.destination.state} replace />
  }
  return <AuthenticatedRoutes />
}

function SessionNavigationObserver() {
  const { user } = useAuth()
  const location = useLocation()
  useEffect(() => {
    const destination = safeSessionDestination(location.pathname, location.search, location.state)
    if (user && destination) rememberSessionNavigation(user.sub, destination)
  }, [user, location.pathname, location.search, location.state])
  return null
}

function AppGate() {
  const { user, sessionReady } = useAuth()

  if (!sessionReady) {
    return (
      <main className="k-screen k-account is-simple">
        <section className="login-card k-account-card is-session" aria-live="polite">
          <h1 className="k-account-simple-title"><BrandLogo className="k-account-logo" /></h1>
          <p className="k-account-simple-sub">Checking your session…</p>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <AppProvider guest>
        <ActionPlay />
        <GuestRoutes />
      </AppProvider>
    )
  }

  return (
    <AppProvider key={user.sub}>
      <ActionPlay />
      <AccountEntryRoutes />
    </AppProvider>
  )
}

const loadMotionFeatures = () => import('./lib/motionFeatures').then(module => module.default)

function RoutedShell() {
  return (
    <>
      <ScrollToTop />
      <SessionNavigationObserver />
      <ToastProvider>
        <RootSurface />
      </ToastProvider>
    </>
  )
}

function AppShell() {
  const router = useRef<ReturnType<typeof createBrowserRouter> | null>(null)
  if (!router.current) {
    router.current = createBrowserRouter(
      [{ path: '*', element: <RoutedShell /> }],
      { basename: routerBasename() },
    )
  }

  return (
    <LazyMotion features={loadMotionFeatures}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <RouterProvider router={router.current} />
        </AuthProvider>
      </MotionConfig>
    </LazyMotion>
  )
}

export default function App() {
  if (!isGoogleAuthConfigured()) {
    return <AppShell />
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppShell />
    </GoogleOAuthProvider>
  )
}
