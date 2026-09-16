import { describe, expect, it, vi } from 'vitest'

import auth from '../../api/auth.js'
import { response } from './helpers.js'

vi.mock('../../api/_lib/ensureAuthSchema.js', () => ({
  prepareAuth: async () => true,
}))

describe('auth action routing', () => {
  it('does not 404 when the action arrives as a query parameter', async () => {
    const res = response()
    await auth({
      method: 'POST',
      query: { action: 'google' },
      headers: {},
      body: {},
      url: '/api/auth?action=google',
    } as never, res as never)

    expect(res.statusCode).not.toBe(404)
  })

  it('answers 404 when no action is present', async () => {
    const res = response()
    await auth({
      method: 'GET',
      query: {},
      headers: {},
      url: '/api/auth',
    } as never, res as never)

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })
})
