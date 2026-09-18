import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { freshState } from '../lib/storage'
import { createOnboardingDraft } from '../lib/onboarding'
import { computeTargets } from '../lib/profile'
import { OnboardingPage } from './OnboardingPage'
import { OnboardingWelcome } from '../components/OnboardingWelcome'

vi.mock('@assets/welcome-1.webp', () => ({ default: '/welcome-1.webp' }))
vi.mock('@assets/welcome-2.webp', () => ({ default: '/welcome-2.webp' }))
vi.mock('@assets/welcome-3.webp', () => ({ default: '/welcome-3.webp' }))
vi.mock('../store/AppContext', () => ({
  useApp: () => ({ state, updateProfile: vi.fn(), setOnboarded: vi.fn(), addEntry: vi.fn() }),
}))
vi.mock('../store/AuthContext', () => ({ useAuth: () => ({ user: { sub: 'welcome-test' } }) }))
vi.mock('../lib/onboarding', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/onboarding')>(),
  loadOnboardingDraft: () => draft,
}))

const state = freshState()
let draft = createOnboardingDraft(state.profile)
const render = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(OnboardingPage)))

beforeEach(() => { draft = createOnboardingDraft(state.profile) })

describe('welcome page UX', () => {
  it('offers one primary start action for an account already signed in', () => {
    const html = render()
    expect(html).toContain('<main class="k-screen k-intro is-hello"')
    expect(html).toContain('<span>Meet</span> <span>Momo.</span>')
    expect(html).not.toContain('poster-')
    expect(html.match(/>Get started\s*</g)).toHaveLength(1)
    expect(html).not.toContain('href="/login"')
    expect(html).not.toContain('onboarding-birthday')
    expect(html).toContain('class="k-intro-stage"')
    expect(html).toContain('class="momo-sticker" aria-hidden="true"')
  })

  it('keeps a returning-user route for guests', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(OnboardingWelcome, {
      index: 0, signedIn: false, onSlideChange: vi.fn(), onStart: vi.fn(),
    })))
    expect(html).toContain('href="/login"')
    expect(html).toContain('<strong>Sign in</strong>')
  })

  it.each([0, 1, 2])('keeps the intro optional on slide %i', index => {
    draft.welcomeIndex = index
    const html = render()
    expect(html).toMatch(/>Get started\s*</)
    expect(html).toContain(`aria-label="Go to slide ${index + 1}:`)
    expect(html.match(/aria-current="step"/g)).toHaveLength(1)
    expect(html).toContain('aria-live="polite" aria-atomic="true"')
    expect(html).toContain(`aria-label="Previous introduction"${index === 0 ? ' disabled=""' : ''}`)
    expect(html).toContain(`aria-label="Next introduction"${index === 2 ? ' disabled=""' : ''}`)
  })

  it('still requires age confirmation after leaving the introduction', () => {
    draft.welcomeIndex = 3
    const html = render()
    expect(html).toContain('What is your date of birth?')
    expect(html).toContain('id="onboarding-birthday"')
    expect(html).not.toContain('k-intro')
    expect(html).toContain('class="app-shell k-screen k-setup"')
    expect(html).toContain('Step 1 of 8: Age')
  })
})

function showSetupStep(step: number) {
  draft.welcomeIndex = 3
  draft.step = step
  draft.birthdayInput = '2000-01-01'
  draft.profile = { ...draft.profile, birthday: '2000-01-01T00:00:00.000Z' }
}

describe('profile setup pages', () => {
  it.each([
    [0, 'What is your date of birth?'], [1, 'About you'], [2, 'Your body'], [3, 'Your goal'],
    [4, 'Activity level'], [5, 'Choose your pace'], [6, 'Your daily targets'], [7, 'Log your first meal'],
  ] as const)('renders step %i with one heading, native submission, progress and Back', (step, heading) => {
    showSetupStep(step)
    const html = render()
    expect(html).toContain(heading)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html.match(/<form\b/g)).toHaveLength(1)
    expect(html).toContain('type="submit"')
    expect(html).toContain('Back')
    expect(html).toContain('Your account is ready')
    expect(html).toContain(`aria-valuenow="${step + 1}"`)
    expect(html.toLowerCase()).not.toContain('autofocus')
  })

  it('connects the birthday field to the purpose and profile controls', () => {
    showSetupStep(0)
    const html = render()
    expect(html).toContain('autoComplete="bday"')
    expect(html).toContain('aria-describedby="birthday-purpose birthday-control"')
    expect(html).toContain('18 and over')
  })

  it('keeps the adult block safe while offering a recovery path', () => {
    draft.blocked = true
    const html = render()
    expect(html).toContain('This one is built for adults')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('type="submit"')
    expect(html).toContain('Change date of birth')
    expect(html).toContain('Back to welcome')
  })

  it('offers optional body fat separately and decimal measurement inputs', () => {
    showSetupStep(2)
    const html = render()
    expect(html).toContain('<details class="setup-optional"')
    expect(html).toContain('Only enter this if you know it.')
    expect(html.match(/inputMode="decimal"/g)).toHaveLength(3)
    expect(html).toContain('aria-describedby="body-values-hint"')
  })

  it.each([[1, 'equation-label'], [3, 'Weight goal'], [4, 'Activity level'], [5, 'Logging pace']] as const)(
    'names the choice group on step %i and marks its selected option', (step, name) => {
      showSetupStep(step)
      const html = render()
      expect(html).toContain('role="group"')
      expect(html).toContain(name)
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
      expect(html).toContain('class="setup-selected" aria-hidden="true"')
    },
  )

  it('reviews the existing calculated target and offers profile editing', () => {
    showSetupStep(6)
    const html = render()
    expect(html).toContain(String(computeTargets(draft.profile).calories))
    expect(html).toContain('aria-label="Profile used for this estimate"')
    expect(html).toContain('>Edit profile details</button>')
    expect(html).toContain('Continue to first meal')
  })

  it('shows a real first-meal total before the save action', () => {
    showSetupStep(7)
    draft.firstMeal = { ...draft.firstMeal, name: 'Yogurt bowl', calories: '320', mealType: 'breakfast' }
    const html = render()
    expect(html).toContain('aria-label="First meal summary"')
    expect(html).toContain('320 kcal')
    expect(html).toContain('Breakfast · Total for this meal')
    expect(html.indexOf('First meal summary')).toBeLessThan(html.indexOf('type="submit"'))
    expect(html).toContain('aria-labelledby="first-meal-type-label"')
  })

  it('does not invent a total for an unfinished meal', () => {
    showSetupStep(7)
    expect(render()).not.toContain('aria-label="First meal summary"')
    expect(render()).toContain('<button type="submit" disabled=""')
  })
})
