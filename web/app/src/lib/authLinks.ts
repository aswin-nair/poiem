/** Carry only public flow flags. Reset tokens and credentials never enter a return link. */
export function authContextPath(path: '/login' | '/forgot-password', params: URLSearchParams, passwordUpdated = false): string {
  const next = new URLSearchParams()
  for (const flag of ['claim', 'setup']) if (params.get(flag) === '1') next.set(flag, '1')
  if (passwordUpdated) next.set('passwordUpdated', '1')
  const search = next.toString()
  return `${path}${search ? `?${search}` : ''}`
}
