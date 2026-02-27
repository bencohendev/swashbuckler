import {
  test,
  expect,
  createEntry,
  createEntryWithTitle,
  createType,
} from './helpers'

test.describe('Types & Entries — regression tests', () => {
  test('default Page type exists in sidebar', async ({ guestPage: page }) => {
    // Regression: 2026-02-24 guest mode had no default type
    const sidebar = page.locator('aside, nav').first()
    await expect(sidebar.getByText(/page/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('can create new entry from sidebar', async ({ guestPage: page }) => {
    await createEntry(page)

    // Should be on an object page
    await expect(page).toHaveURL(/\/objects\//)

    // Editor should be visible
    const editor = page.locator('[data-slate-editor="true"], [contenteditable]')
    await expect(editor.first()).toBeVisible({ timeout: 10000 })
  })

  test('can create a new type with custom name', async ({ guestPage: page }) => {
    await createType(page, 'Recipe')

    // The new type should appear in the sidebar
    const sidebar = page.locator('aside, nav').first()
    await expect(sidebar.getByText('Recipes', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('type page shows entries when navigated to', async ({ guestPage: page }) => {
    // Create an entry first
    await createEntryWithTitle(page, 'Test Entry')
    await page.waitForTimeout(1000)

    // Navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Navigate directly to the type page
    await page.goto('/types/page', { waitUntil: 'domcontentloaded' })

    // Entry should be listed on the type page
    await expect(page.getByText('Test Entry').first()).toBeVisible({ timeout: 10000 })
  })

  test('multiple entries get unique default names', async ({ guestPage: page }) => {
    // Regression: 2026-02-24 duplicate default names
    // Create first entry
    await createEntry(page)

    // Read the title — may be in value or placeholder
    const input1 = page.locator('input.text-3xl, input[placeholder="Untitled"]').first()
    await input1.waitFor({ state: 'visible', timeout: 10000 })
    const value1 = await input1.inputValue()
    const placeholder1 = await input1.getAttribute('placeholder') ?? ''
    const title1 = value1 || placeholder1

    // Go back and create second entry
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await createEntry(page)

    const input2 = page.locator('input.text-3xl, input[placeholder="Untitled"]').first()
    await input2.waitFor({ state: 'visible', timeout: 10000 })
    const value2 = await input2.inputValue()
    const placeholder2 = await input2.getAttribute('placeholder') ?? ''
    const title2 = value2 || placeholder2

    // Both should have non-empty titles
    expect(title1).toBeTruthy()
    expect(title2).toBeTruthy()

    // Titles should be different (e.g. "New Page" vs "New Page 2")
    expect(title1).not.toBe(title2)
  })
})
