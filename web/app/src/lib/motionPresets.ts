/** Shared Motion recipes for the food-quest UI. Keep the rhythm consistent. */
export const motionSpring = {
  type: 'spring',
  stiffness: 360,
  damping: 25,
  mass: 0.8,
} as const

export const motionSoftSpring = {
  type: 'spring',
  stiffness: 220,
  damping: 24,
  mass: 0.9,
} as const

export const motionFade = {
  type: 'tween',
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
} as const

/** CSS form of motionFade.ease. Welcome `--wp-ease` and screen fades use this. */
export const motionCssEase = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const motionMs = {
  fade: 240,
  enter: 500,
  press: 120,
} as const

/** Full props for an opacity-only entrance; motionFade is a transition, not props. */
export const motionOpacity = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: motionFade,
} as const

/** Keyframe loops need a tween; physics springs only support two keyframes. */
export const motionIdle = {
  type: 'tween',
  duration: 2.8,
  ease: 'easeInOut',
  repeat: Infinity,
  repeatDelay: 2.4,
} as const

export const motionStagger = {
  ...motionSpring,
  delayChildren: 0.08,
  staggerChildren: 0.055,
} as const

export const motionStep = {
  initial: { opacity: 0, x: 22, rotate: 1.5 },
  animate: { opacity: 1, x: 0, rotate: 0 },
  exit: { opacity: 0, x: -18, rotate: -1 },
  transition: motionSpring,
} as const

export const motionPop = {
  initial: { opacity: 0, scale: 0.84, y: 14 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: -8 },
  transition: motionSoftSpring,
} as const

/** Snack Attack vocabulary: use a named recipe when motion has a clear job. */
export const snapSpring = motionSoftSpring
export const stickerDrop = {
  initial: { opacity: 0, y: 18, rotate: -8, scale: .84 },
  animate: { opacity: 1, y: 0, rotate: 0, scale: 1 },
  transition: motionSoftSpring,
} as const
export const tactilePress = { scale: .96 } as const
export const bubblePop = {
  initial: { opacity: 0, scale: .94, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: motionFade,
} as const
export const plateReveal = {
  initial: { opacity: 0, scale: .88, rotate: -3 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  transition: motionSoftSpring,
} as const
export const pageWipe = motionStep
export const microShake = {
  animate: { x: [0, -3, 3, -2, 2, 0] },
  transition: { type: 'tween', duration: .3 },
} as const
