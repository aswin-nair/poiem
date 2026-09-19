import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { BrandLogo } from './components/BrandLogo'
import identity from './brand/identity.json'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Navigate, Route, RouterProvider, Routes, createBrowserRouter, useLocation, type Location } from 'react-router-dom'
import { googleClientId, isGoogleAuthConfigured } from './lib/auth'
import { hasSeenAccount } from './lib/guestMode'
import { AuthProvider, useAuth } from './store/AuthContext'
import { AppProvider, useApp } from './store/AppContext'
import { ToastProvider } from './components/Toast'
import { HomePage } from './pages/HomePage'
import { LogSheet } from './pages/LogSheet'
import { LogSheetOpenContext } from './lib/logSheetOpen'
import { LogTextPage } from './pages/LogTextPage'
import { PhotoLogPage } from './pages/PhotoLogPage'
import { SavedMealsPage } from './pages/SavedMealsPage'
import { ReviewFoodPage } from './pages/ReviewFoodPage'
import { ManualEntryPage } from './pages/ManualEntryPage'
import { EditFoodPage } from './pages/EditFoodPage'
import { ProgressPage } from './pages/ProgressPage'
import { SettingsPage } from './pages/SettingsPage'
import { AnchorProvider } from './mascot/anchors'
import { MascotOverlay } from './mascot/MascotOverlay'
import { useNavDirection } from './hooks/useNavDirection'
import { LazyMotion, MotionConfig } from 'motion/react'

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

function PageFallback() {
  return <main className="app-main"><p role="status">Opening…</p></main>
}

/** Client-side navigation keeps the browser's scroll offset by default; land each new page at the top. */
function ScrollToTop() {
  const { pathname, search, state } = useLocation()
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
    // A page that loads on demand arrives a moment after the route changes, so keep looking briefly.
    let frame = 0
    let tries = 0
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>('main h1, .app-shell > header h1')
      if (heading) {
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      } else if (++tries < 60) {
        frame = window.requestAnimationFrame(focusHeading)
      }
    }
    frame = window.requestAnimationFrame(focusHeading)
    return () => window.cancelAnimationFrame(frame)
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
    <DirectionalRoutes hold={route.hold}>
    <Routes location={logSheetOpen && background ? background : location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/coach" element={<Suspense fallback={<PageFallback />}><CoachPage /></Suspense>} />
      {/* Opened directly, the log sheet sits over Today. */}
      <Route path="/log" element={<HomePage />} />
      <Route path="/log/text" element={<LogTextPage />} />
      <Route path="/log/photo" element={<PhotoLogPage />} />
      <Route path="/log/saved" element={<SavedMealsPage />} />
      <Route path="/discover" element={<SavedMealsPage />} />
      <Route path="/log/manual" element={<ManualEntryPage />} />
      <Route path="/review" element={<ReviewFoodPage />} />
      <Route path="/edit/:id" element={<EditFoodPage />} />
      <Route path="/settings" element={<SettingsPage />} />
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

  if (!state.onboarded) {
    // A device that has held an account belongs to someone coming back, not to a
    // first-time visitor. Sending them to onboarding would make them rebuild a
    // profile they already have, so the fallback becomes the login screen —
    // which also covers session expiry, not just an explicit sign-out.
    const fallback = hasSeenAccount() ? '/login' : '/onboarding'
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
        <GuestRoutes />
      </AppProvider>
    )
  }

  return (
    <AppProvider key={user.sub}>
      <AuthenticatedRoutes />
    </AppProvider>
  )
}

const loadMotionFeatures = () => import('./lib/motionFeatures').then(module => module.default)

function RoutedShell() {
  return (
    <>
      <ScrollToTop />
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
