const KEY = 'poiem-first-meal-journey'

export function markFirstMealJourney(): void {
  try { sessionStorage.setItem(KEY, '1') } catch { /* private mode */ }
}

export function isFirstMealJourney(): boolean {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

export function firstMealFromNavState(state: unknown): boolean {
  return isFirstMealJourney() || Boolean(state && typeof state === 'object' && (state as { firstMeal?: boolean }).firstMeal)
}

export function clearFirstMealJourney(): void {
  try { sessionStorage.removeItem(KEY) } catch { /* private mode */ }
}
