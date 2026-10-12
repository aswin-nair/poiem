import type { AuthUser } from './auth'
import { saveAuthSession, clearAuthSession } from './auth'
import {
  apiGoogleAuth,
  apiLogin,
  apiLogout,
  apiRegister,
  clearAuthToken,
  loadAuthToken,
  saveVerifiedAuthToken,
} from './apiClient'
import { registerWithEmail, loginWithEmail } from './localAuth'

export async function registerAccount(
  name: string,
  email: string,
  password: string,
  cloud: boolean,
): Promise<AuthUser> {
  if (cloud) {
    const { token, user } = await apiRegister(name, email, password)
    saveVerifiedAuthToken(token, user.sub)
    saveAuthSession(user)
    return user
  }
  const user = await registerWithEmail(name, email, password)
  saveAuthSession(user)
  return user
}

export async function loginAccount(
  email: string,
  password: string,
  cloud: boolean,
): Promise<AuthUser> {
  if (cloud) {
    const { token, user } = await apiLogin(email, password)
    saveVerifiedAuthToken(token, user.sub)
    saveAuthSession(user)
    return user
  }
  const user = await loginWithEmail(email, password)
  saveAuthSession(user)
  return user
}

export async function googleAccount(credential: string, cloud: boolean): Promise<AuthUser> {
  if (cloud) {
    const { token, user } = await apiGoogleAuth(credential)
    saveVerifiedAuthToken(token, user.sub)
    saveAuthSession(user)
    return user
  }
  throw new Error('Google sign-in requires cloud backend')
}

export async function logoutAccount(cloud: boolean): Promise<boolean> {
  const token = cloud ? loadAuthToken() : null
  clearAuthSession()
  if (cloud) clearAuthToken()
  if (!cloud || !token) return true
  try {
    await apiLogout(token)
    return true
  } catch {
    // Local sign-out must always work. The server session expires on its own if
    // a best-effort revocation cannot reach the account service.
    return false
  }
}
