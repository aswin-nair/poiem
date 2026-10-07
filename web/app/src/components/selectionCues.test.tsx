import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/feel', () => ({ feel: vi.fn() }))

const renderedSwitch = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))
// SSR runs Toggle's hooks normally but does not serialize its event handlers.
// Capture the real input props while leaving React's JSX factory unchanged.
vi.mock('react/jsx-runtime', async importOriginal => {
  const actual = await importOriginal<typeof import('react/jsx-runtime')>()
  return {
    ...actual,
    jsx(...args: Parameters<typeof actual.jsx>) {
      const [type, props] = args
      if (type === 'input' && (props as Props).role === 'switch') renderedSwitch.props = props as Props
      return actual.jsx(...args)
    },
  }
})
vi.mock('react/jsx-dev-runtime', async importOriginal => {
  const actual = await importOriginal<typeof import('react/jsx-dev-runtime')>()
  return {
    ...actual,
    jsxDEV(...args: Parameters<typeof actual.jsxDEV>) {
      const [type, props] = args
      if (type === 'input' && (props as Props).role === 'switch') renderedSwitch.props = props as Props
      return actual.jsxDEV(...args)
    },
  }
})

import { feel } from '../lib/feel'
import { RadioDot, Toggle } from './Toggle'
import { WeekStrip } from './WeekStrip'
import { FilterGroup } from './system/FilterGroup'

type Props = Record<string, unknown>

/* Hook-free controls can return their element tree directly. Toggle renders
   through React, with its input handler captured by the transparent JSX wrapper. */
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

beforeEach(() => {
  vi.mocked(feel).mockClear()
  renderedSwitch.props = null
})

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
    const html = renderToStaticMarkup(createElement(Toggle, { checked: false, onChange }))
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('role="switch"')
    expect(renderedSwitch.props).not.toBeNull()
    ;(renderedSwitch.props!.onChange as (event: unknown) => void)({ target: { checked: true } })
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
