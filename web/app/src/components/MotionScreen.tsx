import type { ReactNode } from 'react'
import { LazyMotion } from 'motion/react'
import motionFeatures from '../lib/motionFeatures'

/** Loaded with animated screens; adds no element or new motion preference. */
export function MotionScreen({ children }: { children: ReactNode }) {
  return <LazyMotion features={motionFeatures}>{children}</LazyMotion>
}
