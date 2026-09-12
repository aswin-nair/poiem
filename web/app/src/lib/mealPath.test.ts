import { describe, expect, it } from 'vitest'
import { mascotSlot, mealPathStates } from './mealPath'

function entry(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other') {
  return { mealType }
}

describe('meal path derivation', () => {
  it('marks every slot later and stands on breakfast at 8 with no entries', () => {
    const nodes = mealPathStates([], 8)
    expect(nodes.map(node => node.status)).toEqual(['current', 'later', 'later', 'later'])
    expect(mascotSlot(nodes)).toBe('breakfast')
  })

  it('fills breakfast and stands on lunch at 8 after one breakfast log', () => {
    const nodes = mealPathStates([entry('breakfast')], 8)
    expect(nodes[0]?.status).toBe('done')
    expect(nodes[1]?.status).toBe('current')
    expect(mascotSlot(nodes)).toBe('lunch')
  })

  it('ignores other as a fifth node', () => {
    const nodes = mealPathStates([entry('other'), entry('other')], 14)
    expect(nodes).toHaveLength(4)
    expect(nodes.every(node => node.status !== 'done')).toBe(true)
    expect(mascotSlot(nodes)).toBe('lunch')
  })

  it('marks all four done after a full day and parks the mascot on snack', () => {
    const nodes = mealPathStates(
      [entry('breakfast'), entry('lunch'), entry('dinner'), entry('snack'), entry('snack')],
      22,
    )
    expect(nodes.every(node => node.status === 'done')).toBe(true)
    expect(mascotSlot(nodes)).toBe('snack')
  })
})
