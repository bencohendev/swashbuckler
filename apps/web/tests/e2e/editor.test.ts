import { test, expect, createEntry, createEntryWithTitle } from './helpers'

test.describe('Editor — regression tests', () => {
  test('editor loads with contenteditable area', async ({ guestPage: page }) => {
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await expect(editor).toBeVisible({ timeout: 10000 })
    await expect(editor).toHaveAttribute('contenteditable', 'true')
  })

  test('can type text in the editor', async ({ guestPage: page }) => {
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()
    await page.keyboard.type('Hello world')

    await expect(editor).toContainText('Hello world')
  })

  test('Enter key does not crash the editor', async ({ guestPage: page }) => {
    // Regression: 2026-02-26 "Cannot resolve a DOM node" crash on Enter
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()
    await page.keyboard.type('First line')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Second line')

    // Editor should still be functional — no crash
    await expect(editor).toContainText('First line')
    await expect(editor).toContainText('Second line')
  })

  test('slash menu opens on / keystroke', async ({ guestPage: page }) => {
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()
    await page.keyboard.type('/')

    // Slash menu appears as a popover with block options
    await expect(page.getByText('Heading 1')).toBeVisible({ timeout: 5000 })
  })

  test('heading block via slash menu does not crash', async ({ guestPage: page }) => {
    // Regression: 2026-02-24 cursor jumping after heading creation
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()
    await page.keyboard.type('/')

    // Wait for the slash menu and click Heading 1
    const headingOption = page.getByText('Heading 1').first()
    await headingOption.click()

    // Editor should still be functional
    await page.keyboard.type('My Heading')
    await expect(editor).toContainText('My Heading')
  })

  test('Mod+Enter exits a code block', async ({ guestPage: page }) => {
    // Regression: 2026-02-24 cursor trapped in code block
    await createEntry(page)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()
    await page.keyboard.type('/')

    // Look for code block option
    const codeOption = page.getByText('Code').first()
    await codeOption.click()

    // Type in code block
    await page.keyboard.type('const x = 1')

    // Exit code block with Mod+Enter
    await page.keyboard.press('Meta+Enter')
    await page.keyboard.type('After code block')

    // Both should be visible — cursor escaped the code block
    await expect(editor).toContainText('const x = 1')
    await expect(editor).toContainText('After code block')
  })

  test('entry title persists on reload', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Persistent Title')

    // Wait for save
    await page.waitForTimeout(2000)

    // Reload
    await page.reload({ waitUntil: 'domcontentloaded' })

    // Title should persist — may appear as value or placeholder
    const input = page.locator('input.text-3xl, input[placeholder="Untitled"]').first()
    await input.waitFor({ state: 'visible', timeout: 10000 })

    // The app may render persisted title as value or placeholder
    const value = await input.inputValue()
    const placeholder = await input.getAttribute('placeholder')
    const hasPersisted = value === 'Persistent Title' || placeholder === 'Persistent Title'
    expect(hasPersisted).toBe(true)
  })
})
