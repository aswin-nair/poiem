import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FOLLOW_THRESHOLD_PX, distanceFromBottom, followScrollBehavior, nextFollowState, shouldFollowConversation } from './coachScroll'

describe('coach conversation following', () => {
  it('follows a reader who is at, or within 80 px of, the bottom', () => {
    expect(FOLLOW_THRESHOLD_PX).toBe(80)
    expect(shouldFollowConversation(0)).toBe(true)
    expect(shouldFollowConversation(79)).toBe(true)
    expect(shouldFollowConversation(80)).toBe(true)
  })

  it('stops following once the reader is more than 80 px above the bottom', () => {
    expect(shouldFollowConversation(81)).toBe(false)
    expect(shouldFollowConversation(600)).toBe(false)
  })

  it('treats overscroll as the bottom and a fractional overshoot as above it', () => {
    expect(shouldFollowConversation(-4)).toBe(true)
    expect(shouldFollowConversation(80.4)).toBe(false)
  })

  it('uses an instant jump under reduced motion and a smooth scroll otherwise', () => {
    expect(followScrollBehavior(true)).toBe('auto')
    expect(followScrollBehavior(false)).toBe('smooth')
  })

  describe('follow flag across scroll events', () => {
    const next = (previous: boolean, distanceFromBottom: number, scrolledUp: boolean) =>
      nextFollowState({ previous, distanceFromBottom, scrolledUp })

    it('turns on within the threshold whatever the previous value or direction', () => {
      for (const previous of [true, false]) {
        for (const scrolledUp of [true, false]) {
          for (const distance of [-4, 0, 79, 80]) expect(next(previous, distance, scrolledUp), `${previous} ${distance} ${scrolledUp}`).toBe(true)
        }
      }
    })

    it('turns off only when the reader scrolls up beyond the threshold', () => {
      expect(next(true, 81, true)).toBe(false)
      expect(next(true, 600, true)).toBe(false)
      expect(next(false, 81, true)).toBe(false)
    })

    it('keeps the previous value while scrolling down beyond the threshold, so the page\'s own smooth scroll never clears it', () => {
      expect(next(true, 81, false)).toBe(true)
      expect(next(true, 150, false)).toBe(true)
      expect(next(false, 81, false)).toBe(false)
      expect(next(false, 600, false)).toBe(false)
    })

    it('uses the same 79, 80, 81 boundary as the near-bottom rule', () => {
      expect(next(false, 79, false)).toBe(true)
      expect(next(false, 80, false)).toBe(true)
      expect(next(false, 81, false)).toBe(false)
      expect(next(true, 81, true)).toBe(false)
    })
  })

  it('re-arms following only for a send that goes through, after every early-return gate', () => {
    const page = readFileSync(new URL('../pages/CoachPage.tsx', import.meta.url), 'utf8')
    const send = page.slice(page.indexOf('async function send('))
    const arm = send.indexOf('followConversation.current = true')
    expect(arm, 'send re-arms following').toBeGreaterThan(-1)
    expect(send.indexOf('followConversation.current = true', arm + 1), 'send re-arms following once').toBe(-1)
    for (const gate of ['if (!trimmed || loading || requestRef.current) return', 'if (retry && !state.chatMessages.some(message => message.id === retry.userMessage.id)) return', 'if (!safety && !canChat) {']) {
      expect(send.indexOf(gate), gate).toBeGreaterThan(-1)
      expect(arm, `re-arming follows ${gate}`).toBeGreaterThan(send.indexOf(gate))
    }
    /* The refusal branch returns before the flag is touched. */
    expect(send.slice(send.indexOf('if (!safety && !canChat) {'), arm)).toMatch(/\breturn\b/)
    expect(arm).toBeLessThan(send.indexOf('addChatMessage(userMsg)'))
  })

  it('measures the distance from the maximum scroll position', () => {
    expect(distanceFromBottom({ scrollHeight: 2000, clientHeight: 800, scrollTop: 1200 })).toBe(0)
    expect(distanceFromBottom({ scrollHeight: 2000, clientHeight: 800, scrollTop: 1121 })).toBe(79)
    expect(distanceFromBottom({ scrollHeight: 2000, clientHeight: 800, scrollTop: 1000 })).toBe(200)
    expect(distanceFromBottom({ scrollHeight: 600, clientHeight: 800, scrollTop: 0 })).toBe(-200)
  })
})
