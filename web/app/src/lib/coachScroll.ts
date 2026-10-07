/** How far above the bottom a reader may be and still have the conversation follow new messages. */
export const FOLLOW_THRESHOLD_PX = 80

interface ScrollMetrics {
  scrollHeight: number
  clientHeight: number
  scrollTop: number
}

/** Pixels between the viewport's bottom edge and the end of the page (zero or negative at the bottom). */
export function distanceFromBottom({ scrollHeight, clientHeight, scrollTop }: ScrollMetrics): number {
  return scrollHeight - clientHeight - scrollTop
}

/** A reader who has scrolled up to re-read is never dragged back down by a new message. */
export function shouldFollowConversation(distance: number): boolean {
  return distance <= FOLLOW_THRESHOLD_PX
}

/**
 * The follow flag after one scroll event. Near the bottom the reader is following, whatever
 * the direction. Further up, only the reader scrolling up (scrollTop fell) stops following:
 * the page's own follow scrolls only move down, so while one is still in flight (more than
 * the threshold remaining) it must not clear a flag the send just set.
 */
export function nextFollowState({ previous, distanceFromBottom, scrolledUp }: {
  previous: boolean
  distanceFromBottom: number
  scrolledUp: boolean
}): boolean {
  if (shouldFollowConversation(distanceFromBottom)) return true
  return scrolledUp ? false : previous
}

/** Smooth scrolling is decoration: the OS reduced-motion preference gets an instant jump. */
export function followScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? 'auto' : 'smooth'
}
