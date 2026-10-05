import { describe, expect, it } from 'vitest'
import { FOLLOW_THRESHOLD_PX, distanceFromBottom, followScrollBehavior, shouldFollowConversation } from './coachScroll'

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

  it('measures the distance from the maximum scroll position', () => {
    expect(distanceFromBottom({ scrollHeight: 2000, clientHeight: 800, scrollTop: 1200 })).toBe(0)
    expect(distanceFromBottom({ scrollHeight: 2000, clientHeight: 800, scrollTop: 1121 })).toBe(79)
    expect(distanceFromBottom({ scrollHeight: 2000, clientHeight: 800, scrollTop: 1000 })).toBe(200)
    expect(distanceFromBottom({ scrollHeight: 600, clientHeight: 800, scrollTop: 0 })).toBe(-200)
  })
})
