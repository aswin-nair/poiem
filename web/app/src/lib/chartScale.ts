/**
 * The calorie chart's vertical axis, fitted to what is on it: the biggest day or
 * the goal, whichever is higher, plus 15% so neither touches the top, rounded up
 * to a whole thousand. The middle tick is then always a round number
 * (0 / 1,000 / 2,000, 0 / 1.5k / 3k), and a typical day fills most of the height
 * instead of the 40% a fixed 4,000 ceiling left.
 */
export function calorieAxis(maxValue: number, goal: number | undefined): { max: number; ticks: [number, number, number] } {
  const target = Math.max(maxValue, goal ?? 0, 0)
  const max = Math.max(1000, Math.ceil((target * 1.15) / 1000) * 1000)
  return { max, ticks: [0, max / 2, max] }
}
