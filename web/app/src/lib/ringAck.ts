export const RING_ACK_KEY = 'poiem-ring-ack-v1'

export function readRingAck(): string | null {
  try { return localStorage.getItem(RING_ACK_KEY) } catch { return null }
}
export function writeRingAck(dayKey: string): void {
  try { localStorage.setItem(RING_ACK_KEY, dayKey) } catch { /* private/unavailable storage */ }
}
export function clearRingAck(): void {
  try { localStorage.removeItem(RING_ACK_KEY) } catch { /* private/unavailable storage */ }
}
