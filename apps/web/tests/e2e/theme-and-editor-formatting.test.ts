import {
  test,
  expect,
  createEntry,
} from './helpers'

test.describe('Theme & Editor Formatting — regression tests', () => {
  test('theme toggle visible in header', async ({ guestPage: page }) => {
    // The theme button has a title starting with "Theme"
    const themeBtn = page.locator('button[title^="Theme"]')
    await expect(themeBtn).toBeVisible({ timeout: 10000 })
  })

  test('theme cycles on click', async ({ guestPage: page }) => {
    const themeBtn = page.locator('button[title^="Theme"]')
    await expect(themeBtn).toBeVisible({ timeout: 10000 })

    // Wait for hydration — title changes from "Theme" to "Theme: <mode>"
    await expect(async () => {
      const title = await themeBtn.getAttribute('title')
      expect(title).not.toBe('Theme')
    }).toPass({ timeout: 15000 })

    // Get initial title after hydration
    const initialTitle = await themeBtn.getAttribute('title')

    // Click to cycle — retry because the space context may still be loading in CI
    await expect(async () => {
      await themeBtn.click()
      await page.waitForTimeout(200)
      const title = await page.locator('button[title^="Theme"]').getAttribute('title')
      expect(title).not.toBe(initialTitle)
    }).toPass({ timeout: 10000 })

    const nextTitle = await page.locator('button[title^="Theme"]').getAttribute('title')
    expect(nextTitle).toContain('Theme')
  })

  test('dark theme applies class', async ({ guestPage: page }) => {
    const themeBtn = page.locator('button[title^="Theme"]')
    await expect(themeBtn).toBeVisible({ timeout: 10000 })

    // Click until we get dark mode (cycle: light → dark → system → ...)
    for (let i = 0; i < 5; i++) {
      const title = await themeBtn.getAttribute('title')
      if (title?.includes('dark')) break
      await themeBtn.click()
      await page.waitForTimeout(300)
    }

    // Check that html element has the 'dark' class
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('bold autoformat consumes markdown markers', async ({ guestPage: page }) => {
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()
    await page.waitForTimeout(300)

    // Plate's autoformat: typing **text** applies the bold mark and consumes the ** markers
    await page.keyboard.type('**bold text**')
    await page.waitForTimeout(500)

    // The text content should be present
    await expect(editor).toContainText('bold text')
    // The ** markers should have been consumed by the autoformat plugin
    const rawText = await editor.textContent()
    expect(rawText).not.toContain('**')
  })

  test('blockquote via slash menu', async ({ guestPage: page }) => {
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()

    // Open slash menu
    await page.keyboard.type('/')

    // Click "Quote" option
    const quoteOption = page.getByText('Quote').first()
    await expect(quoteOption).toBeVisible({ timeout: 5000 })
    await quoteOption.click()

    // Type in the blockquote
    await page.keyboard.type('A wise quote')

    // Verify blockquote element exists
    await expect(editor.locator('blockquote')).toContainText('A wise quote')
  })

  test('todo checkbox toggles', async ({ guestPage: page }) => {
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()

    // Open slash menu and select "To-do"
    await page.keyboard.type('/')

    const todoOption = page.getByText('To-do').first()
    await expect(todoOption).toBeVisible({ timeout: 5000 })
    await todoOption.click()

    await page.keyboard.type('My task')

    // A checkbox should be present
    const checkbox = editor.locator('input[type="checkbox"], [role="checkbox"]').first()
    await expect(checkbox).toBeVisible({ timeout: 5000 })

    // Click to toggle
    await checkbox.click()

    // Checkbox should be checked
    const isChecked = await checkbox.isChecked().catch(() => {
      // role="checkbox" uses aria-checked
      return checkbox.getAttribute('aria-checked').then(v => v === 'true')
    })
    expect(isChecked).toBe(true)
  })
})
