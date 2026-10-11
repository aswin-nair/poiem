# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-ux.spec.ts >> focused Manual and Coach inputs remain usable at keyboard height in light
- Location: e2e\mobile-ux.spec.ts:136:3

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByLabel('Food name')
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByLabel('Food name')
    14 × locator resolved to <input value="" required="" maxlength="500" id="manual-name" autocomplete="off" placeholder="e.g. Protein shake"/>
       - unexpected value "inactive"

```

```yaml
- textbox "Food name Required":
  - /placeholder: e.g. Protein shake
```

# Test source

```ts
  46  |   expect(box!.width, `${label}: target width`).toBeGreaterThanOrEqual(44)
  47  |   expect(box!.height, `${label}: target height`).toBeGreaterThanOrEqual(44)
  48  | }
  49  | 
  50  | async function open(page: Page, path: string, ready: Locator, label: string) {
  51  |   await page.goto(path)
  52  |   await expect(ready).toBeVisible()
  53  |   await assertFits(page, label)
  54  | }
  55  | 
  56  | async function walkRoutes(page: Page, viewport: Viewport, theme: 'light' | 'dark') {
  57  |   await page.setViewportSize(viewport)
  58  |   const label = `${viewport.width}×${viewport.height} ${theme}`
  59  |   await open(page, '/', page.getByRole('heading', { name: 'Today', exact: true }), `Today ${label}`)
  60  |   await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  61  |   const meals = page.getByRole('region', { name: 'Meals', exact: true })
  62  |   const water = page.getByRole('region', { name: 'Water and notes', exact: true })
  63  |   const mealsBox = await meals.boundingBox()
  64  |   const waterBox = await water.boundingBox()
  65  |   expect(mealsBox).not.toBeNull()
  66  |   expect(waterBox).not.toBeNull()
  67  |   expect(mealsBox!.y + mealsBox!.height, `Meals precede Water ${label}`).toBeLessThanOrEqual(waterBox!.y)
  68  |   await assertThumbTarget(page.getByTestId('fab'), `Log opener ${label}`)
  69  |   await assertThumbTarget(water.getByRole('button', { name: 'Add a glass of water', exact: true }), `Water ${label}`)
  70  | 
  71  |   await page.getByRole('button', { name: 'Add snack', exact: true }).click()
  72  |   const sheet = page.getByRole('dialog', { name: 'Log a meal', exact: true })
  73  |   await expect(sheet).toBeVisible()
  74  |   await expect(sheet.locator('.k-log-meal')).toHaveText('Snack')
  75  |   await assertFits(page, `Log sheet ${label}`)
  76  |   await assertThumbTarget(sheet.getByRole('link', { name: /Manual entry/i }), `Manual entry ${label}`)
  77  |   const recent = sheet.getByRole('article', { name: 'Overnight oats', exact: true })
  78  |   await assertThumbTarget(recent.getByRole('button', { name: /Log Overnight oats, 1 times your previous meal to Snack/ }), `Repeat Log ${label}`)
  79  |   await recent.getByRole('button', { name: /Adjust portion for Overnight oats/ }).click()
  80  |   await assertThumbTarget(recent.getByRole('button', { name: 'Increase portion for Overnight oats', exact: true }), `Repeat portion ${label}`)
  81  |   await assertFits(page, `Expanded repeat portion ${label}`)
  82  | 
  83  |   await open(page, '/log/text', page.getByLabel('Your meal, your words'), `Describe ${label}`)
  84  |   await expect(page.locator('.flow-setup')).toHaveAttribute('data-ai-reason', 'disabled')
  85  |   await assertThumbTarget(page.getByRole('link', { name: 'Log manually', exact: true }), `Describe recovery ${label}`)
  86  | 
  87  |   await open(page, '/log/photo', page.getByRole('heading', { name: 'Give your meal a close-up.', exact: true }), `Photo ${label}`)
  88  |   await expect(page.locator('.flow-setup')).toHaveAttribute('data-ai-reason', 'disabled')
  89  |   await assertThumbTarget(page.getByRole('link', { name: 'Log manually', exact: true }), `Photo recovery ${label}`)
  90  | 
  91  |   await open(page, '/log/manual', page.getByLabel('Food name'), `Manual ${label}`)
  92  |   await assertThumbTarget(page.getByRole('button', { name: 'Log meal', exact: true }), `Manual Log ${label}`)
  93  | 
  94  |   await open(page, '/discover', page.getByRole('heading', { name: 'Saved', exact: true }), `Saved ${label}`)
  95  |   const saved = page.getByRole('article', { name: 'Overnight oats', exact: true })
  96  |   await expect(saved).toContainText('1× = your saved meal')
  97  |   await assertThumbTarget(saved.getByRole('button', { name: /Log Overnight oats, 1 times your saved meal/ }), `Saved Log ${label}`)
  98  | 
  99  |   await open(page, '/progress', page.getByRole('heading', { name: 'Insights', exact: true }), `Insights ${label}`)
  100 |   await assertThumbTarget(page.getByRole('button', { name: '+ Log weight', exact: true }), `Log weight ${label}`)
  101 |   await expect(page.getByText('A trend appears after two weigh-ins in this range.', { exact: true })).toBeVisible()
  102 | 
  103 |   await open(page, '/settings', page.getByRole('heading', { name: 'You', exact: true }), `You overview ${label}`)
  104 |   const category = page.getByRole('combobox', { name: 'Category', exact: true })
  105 |   if (viewport.width < 768) {
  106 |     await expect(category).toHaveJSProperty('tagName', 'SELECT')
  107 |     await assertThumbTarget(category, `Native Category ${label}`)
  108 |     await expect(page.getByRole('navigation', { name: 'You page sections', exact: true })).toBeHidden()
  109 |   } else {
  110 |     await expect(category).toBeHidden()
  111 |     await expect(page.getByRole('navigation', { name: 'You page sections', exact: true })).toBeVisible()
  112 |   }
  113 |   for (const destination of CATEGORIES) {
  114 |     if (viewport.width < 768) await category.selectOption(destination.value)
  115 |     else await page.getByRole('navigation', { name: 'You page sections', exact: true }).getByRole('link', { name: destination.label, exact: true }).click()
  116 |     await expect(page).toHaveURL(new RegExp(`/settings\\?panel=${destination.value}$`))
  117 |     await expect(page.getByRole('heading', { name: destination.heading, exact: true })).toBeVisible()
  118 |     await assertFits(page, `You ${destination.label} ${label}`)
  119 |   }
  120 | 
  121 |   await open(page, '/coach', page.getByRole('heading', { name: 'AI Coach', exact: true }), `Coach ${label}`)
  122 |   const composer = page.getByRole('textbox', { name: 'Message Coach', exact: true })
  123 |   await composer.fill('What are some balanced meal ideas?')
  124 |   await assertThumbTarget(page.getByRole('button', { name: 'Send', exact: true }), `Coach Send ${label}`)
  125 |   await assertFits(page, `Coach draft ${label}`)
  126 | }
  127 | 
  128 | for (const theme of THEMES) {
  129 |   for (const group of VIEWPORT_GROUPS) {
  130 |     test(`${group.name}: core routes and all You categories fit in ${theme}`, async ({ page }) => {
  131 |       await seedWithoutBackend(page, theme)
  132 |       for (const viewport of group.viewports) await walkRoutes(page, viewport, theme)
  133 |     })
  134 |   }
  135 | 
  136 |   test(`focused Manual and Coach inputs remain usable at keyboard height in ${theme}`, async ({ page }) => {
  137 |     await seedWithoutBackend(page, theme, true)
  138 |     await page.setViewportSize({ width: 390, height: 844 })
  139 |     await page.goto('/log/manual')
  140 |     for (const field of [page.getByLabel('Food name'), page.getByLabel('Calories per serving')]) {
  141 |       await page.setViewportSize({ width: 390, height: 844 })
  142 |       await field.focus()
  143 |       // Software keyboards are native UI; emulate their reduced browser area.
  144 |       await page.setViewportSize({ width: 390, height: 400 })
  145 |       await field.scrollIntoViewIfNeeded()
> 146 |       await expect(field).toBeFocused()
      |                           ^ Error: expect(locator).toBeFocused() failed
  147 |       await assertUnobscuredInViewport(field)
  148 |       await assertFits(page, `Focused Manual ${theme}`)
  149 |     }
  150 |     await page.setViewportSize({ width: 390, height: 844 })
  151 |     await page.goto('/coach')
  152 |     const composer = page.getByRole('textbox', { name: 'Message Coach', exact: true })
  153 |     await composer.fill('My meal ideas draft stays editable.')
  154 |     await composer.focus()
  155 |     await page.setViewportSize({ width: 390, height: 400 })
  156 |     await composer.scrollIntoViewIfNeeded()
  157 |     await expect(composer).toBeFocused()
  158 |     await expect(composer).toHaveValue('My meal ideas draft stays editable.')
  159 |     await assertUnobscuredInViewport(composer)
  160 |     await assertUnobscuredInViewport(page.getByRole('button', { name: 'Send', exact: true }))
  161 |     await assertFits(page, `Focused Coach ${theme}`)
  162 |   })
  163 | }
  164 | 
  165 | async function assertUnobscuredInViewport(control: Locator) {
  166 |   const geometry = await control.evaluate(element => {
  167 |     const box = element.getBoundingClientRect()
  168 |     const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
  169 |     return {
  170 |       top: box.top, bottom: box.bottom, left: box.left, right: box.right,
  171 |       viewportHeight: window.innerHeight, viewportWidth: window.innerWidth,
  172 |       unobscured: hit === element || element.contains(hit),
  173 |     }
  174 |   })
  175 |   // Browser scrolling rounds fractional CSS coordinates to device pixels.
  176 |   expect(geometry.top).toBeGreaterThanOrEqual(-1)
  177 |   expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1)
  178 |   expect(geometry.left).toBeGreaterThanOrEqual(-1)
  179 |   expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 1)
  180 |   expect(geometry.unobscured, 'focused control is not covered by navigation').toBe(true)
  181 | }
  182 | 
```