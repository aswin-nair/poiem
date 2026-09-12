import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import { MomoWardrobe } from './MomoWardrobe'

let state = freshState()
vi.mock('../store/AppContext', () => ({ useApp: () => ({ state, patchGamification: vi.fn() }) }))
beforeEach(() => { state = freshState() })

describe("Momo's dressing room", () => {
  it('shows what Momo wears, every piece in the slot, and how locked pieces unlock', () => {
    state.gamification.outfit = { head: 'blossom' }
    const html = renderToStaticMarkup(<MomoWardrobe />)
    expect(html).toContain('Wearing Blossom clip')
    expect(html).toContain('role="group" aria-label="Wardrobe slot"')
    expect(html.match(/class="k-wardrobe-piece"/g)).toHaveLength(7)
    expect(html).toContain('aria-pressed="true"><span class="k-wardrobe-thumb"')
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('10 logged days')
    expect(html).not.toContain('streak')
  })

  it('lets an empty outfit say so, with nothing to take off', () => {
    const html = renderToStaticMarkup(<MomoWardrobe />)
    expect(html).toContain('Wearing nothing. Just dumpling.')
    expect(html).toContain('disabled="">Take it all off')
  })
})
