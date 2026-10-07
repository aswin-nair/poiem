import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/feel', () => ({ feel: vi.fn() }))

import { feel } from '../lib/feel'
import { RadioDot, Toggle } from './Toggle'
import { WeekStrip } from './WeekStrip'
import { FilterGroup } from './system/FilterGroup'

type Props = Record<string, unknown>

/* There is no DOM here, so these controls are called as plain functions (none of
   them uses a hook) and their handlers are read from the element tree they return. */
function collect(node: ReactNode, match: (props: Props) => boolean, found: Props[] = []): Props[] {
  Children.forEach(node, child => {
    if (!isValidElement(child)) return
    const props = (child as ReactElement<Props>).props
    if (match(props)) found.push(props)
    collect(props.children as ReactNode, match, found)
  })
  return found
}

const click = (props: Props) => (props.onClick as () => void)()

beforeEach(() => vi.mocked(feel).mockClear())

describe('WeekStrip day selection', () => {
  const selected = new Date(Date.now() - 60 * 86_400_000)
  const days = (onSelect: (date: Date) => void) =>
    collect(WeekStrip({ selectedDate: selected, onSelect, showWeekNav: false }), props => props.className === 'week-day')

  it('emits one select cue and selects when the day changes', () => {
    const onSelect = vi.fn()
    const buttons = days(onSelect)
    expect(buttons).toHaveLength(7)
    const other = buttons.find(props => props['aria-pressed'] === false)!
    click(other)
    expect(feel).toHaveBeenCalledTimes(1)
    expect(feel).toHaveBeenCalledWith('select')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('still selects the already selected day, with no cue', () => {
    const onSelect = vi.fn()
    const current = days(onSelect).find(props => props['aria-pressed'] === true)!
    click(current)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(feel).not.toHaveBeenCalled()
  })
})

describe('Toggle and RadioDot', () => {
  it('a switch emits one select cue and reports the new value', () => {
    const onChange = vi.fn()
    const [input] = collect(Toggle({ checked: false, onChange }), props => props.role === 'switch')
    ;(input.onChange as (event: unknown) => void)({ target: { checked: true } })
    expect(feel).toHaveBeenCalledTimes(1)
    expect(feel).toHaveBeenCalledWith('select')
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('a radio emits a cue only when it becomes checked', () => {
    const onChange = vi.fn()
    const choose = (checked: boolean) => {
      const [input] = collect(RadioDot({ checked, name: 'g', onChange }), props => props.type === 'radio')
      ;(input.onChange as () => void)()
    }
    choose(true)
    expect(feel).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    choose(false)
    expect(feel).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('FilterGroup', () => {
  const options = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]
  const buttons = (onChange: (id: string) => void) =>
    collect(FilterGroup({ label: 'Filter', options, value: 'a', onChange }), props => props.type === 'button')

  it('emits one select cue for a different option and none for the current one', () => {
    const onChange = vi.fn()
    const [current, other] = buttons(onChange)
    click(current)
    expect(feel).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    click(other)
    expect(feel).toHaveBeenCalledTimes(1)
    expect(feel).toHaveBeenCalledWith('select')
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
