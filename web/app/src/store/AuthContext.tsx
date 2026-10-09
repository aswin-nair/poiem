import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CredentialResponse } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import type { AuthUser, GoogleJwtPayload } from '../lib/auth'
import { AUTH_SESSION_STORAGE_KEY, clearAuthSession, loadAuthSession, saveAuthSession } from '../lib/auth'
import { googleAccount, loginAccount, logoutAccount, registerAccount } from '../lib/authService'
import { apiRefreshSession, clearAuthToken, clearLegacyAuthToken } from '../lib/apiClient'
import { isCloudBackend } from '../lib/dataBackend'
import { markAccountSeen, stageGuestStateForAccount } from '../lib/guestMode'
import { acceptSessionAccount, clearSessionNavigation, currentSessionDestination, markSessionNavigationExpired, rememberSessionNavigation } from '../lib/sessionNavigation'

interface AuthContextValue {
  user: AuthUser | null
  sessionReady: boolean
  signInWithGoogle: (response: CredentialResponse) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
  expireSession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function persistUser(user: AuthUser, setUser: (u: AuthUser) => void) {
  acceptSessionAccount(user.sub)
  saveAuthSession(user)
  markAccountSeen()
  setUser(user)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cloud = isCloudBackend()
  const [user, setUser] = useState<AuthUser | null>(() => (cloud ? null : loadAuthSession()))
  const [sessionReady, setSessionReady] = useState(!cloud)

  useEffect(() => {
    clearLegacyAuthToken()
    if (!cloud) {
      setSessionReady(true)
      return
    }

    let cancelled = false
    const previous = loadAuthSession()
    const destination = currentSessionDestination()
    if (previous && destination) rememberSessionNavigation(previous.sub, destination)
    void apiRefreshSession().then(result => {
      if (cancelled) return
      if (result) persistUser(result.user, setUser)
      else {
        if (previous) markSessionNavigationExpired(previous.sub)
        clearAuthSession()
        clearAuthToken()
        setUser(null)
      }
    }).finally(() => {
      if (!cancelled) setSessionReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [cloud])

  useEffect(() => {
    function refreshFromSharedStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== AUTH_SESSION_STORAGE_KEY) return
      setUser(current => {
        const next = loadAuthSession()
        if (current?.sub !== next?.sub) {
          clearAuthToken()
          clearSessionNavigation()
        }
        return next
      })
    }

    window.addEventListener('storage', refreshFromSharedStorage)
    return () => window.removeEventListener('storage', refreshFromSharedStorage)
  }, [])

  const signInWithGoogle = useCallback(async (response: CredentialResponse) => {
    if (!response.credential) return
    if (cloud) {
      const next = await googleAccount(response.credential, true)
      await stageGuestStateForAccount(next.sub)
      persistUser(next, setUser)
      return
    }
    const decoded = jwtDecode<GoogleJwtPayload>(response.credential)
    persistUser({
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      provider: 'google',
    }, setUser)
  }, [cloud])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const next = await loginAccount(email, password, cloud)
    if (cloud) await stageGuestStateForAccount(next.sub)
    persistUser(next, setUser)
  }, [cloud])

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const next = await registerAccount(name, email, password, cloud)
    await stageGuestStateForAccount(next.sub)
    persistUser(next, setUser)
  }, [cloud])

  const signOut = useCallback(() => {
    clearSessionNavigation()
    setUser(null)
    void logoutAccount(cloud)
  }, [cloud])

  const expireSession = useCallback(() => {
    if (user) {
      const destination = currentSessionDestination()
      if (destination) rememberSessionNavigation(user.sub, destination)
      markSessionNavigationExpired(user.sub)
    }
    clearAuthSession()
    clearAuthToken()
    setUser(null)
  }, [user])

  const value = useMemo(() => ({
    user,
    sessionReady,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    expireSession,
  }), [user, sessionReady, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, expireSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
