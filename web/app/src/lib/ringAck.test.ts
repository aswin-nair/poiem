import { afterEach, expect, it, vi } from 'vitest'
import { clearRingAck, readRingAck, writeRingAck, RING_ACK_KEY } from './ringAck'

afterEach(() => vi.unstubAllGlobals())
it('round-trips a day key', () => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) })
  expect(readRingAck()).toBeNull()
  writeRingAck('2026-10-05')
  expect(values.get(RING_ACK_KEY)).toBe('2026-10-05')
  expect(readRingAck()).toBe('2026-10-05')
  clearRingAck()
  expect(readRingAck()).toBeNull()
})
it('tolerates missing storage', () => {
  vi.stubGlobal('localStorage', undefined)
  expect(readRingAck()).toBeNull()
  expect(() => writeRingAck('2026-10-05')).not.toThrow()
  expect(() => clearRingAck()).not.toThrow()
})
it('clear removes it', () => {
  const removeItem = vi.fn()
  vi.stubGlobal('localStorage', { removeItem })
  clearRingAck()
  expect(removeItem).toHaveBeenCalledWith(RING_ACK_KEY)
})
