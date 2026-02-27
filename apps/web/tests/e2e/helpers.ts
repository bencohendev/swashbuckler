import { test as base, expect, type Page } from '@playwright/test'

/**
 * Custom fixture that sets up a guest-mode page with the tutorial dismissed.
 */
export const test = base.extend<{ guestPage: Page }>({
  guestPage: async ({ page, context }, use) => {
    // Set guest cookie so the app loads in guest mode
    await context.addCookies([
      {
        name: 'swashbuckler-guest',
        value: '1',
        domain: 'localhost',
        path: '/',
      },
    ])
    // Dismiss the onboarding tutorial via localStorage before navigating
    await page.goto('/dashboard', { waitUntil: 'commit' })
    await page.evaluate(() => {
      localStorage.setItem('swashbuckler:tutorialCompleted', 'true')
    })
    // Navigate again so tutorial state is read on mount
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    // Wait for the sidebar to confirm guest mode loaded
    await expect(page.locator('aside, nav').first()).toBeVisible({
      timeout: 30000,
    })
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)
  },
})

export { expect }

// ---------------------------------------------------------------------------
// Entry helpers
// ---------------------------------------------------------------------------

/** Locator for the object title input on the editor page. */
function titleInput(page: Page) {
  // The title is a large bold <input> — may have a value or placeholder
  return page.locator('input.text-3xl, input[placeholder="Untitled"]').first()
}

/**
 * Creates a new entry via the type's "..." menu > "Create" in the sidebar.
 * Waits for navigation to the new object page.
 */
export async function createEntry(page: Page): Promise<string> {
  // Open the type options dropdown (the "..." button next to "Pages")
  const optionsButton = page.getByRole('button', { name: /options/i }).first()
  await optionsButton.click()

  // Click "Create" in the dropdown
  const createItem = page.getByRole('menuitem', { name: /^create$/i })
  await createItem.click()

  await page.waitForURL(/\/objects\//, { timeout: 10000 })
  const url = page.url()
  const id = url.split('/objects/')[1]?.split('?')[0] ?? ''
  return id
}

/**
 * Creates a new entry and fills in the title.
 */
export async function createEntryWithTitle(
  page: Page,
  title: string,
): Promise<string> {
  const id = await createEntry(page)
  const input = titleInput(page)
  await input.waitFor({ state: 'visible', timeout: 10000 })
  await input.fill(title)
  // Brief wait for debounced save
  await page.waitForTimeout(500)
  return id
}

/**
 * Creates a new type via the sidebar "New Type" button and dialog.
 */
export async function createType(
  page: Page,
  name: string,
): Promise<void> {
  // Click "New Type" button in sidebar
  const newTypeButton = page.getByRole('button', { name: /new type/i }).first()
  await newTypeButton.click()

  // Wait for the dialog
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible({ timeout: 5000 })

  // Fill in the type name
  const nameInput = dialog.getByLabel(/name/i).first()
  await nameInput.fill(name)

  // Submit
  const submitButton = dialog.getByRole('button', { name: /create/i })
  await submitButton.click()

  // Wait for dialog to close
  await expect(dialog).not.toBeVisible({ timeout: 5000 })
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

export async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')
}

export async function navigateToGraph(page: Page): Promise<void> {
  await page.goto('/graph')
  await page.waitForLoadState('domcontentloaded')
}

export async function navigateToTrash(page: Page): Promise<void> {
  await page.goto('/trash')
  await page.waitForLoadState('domcontentloaded')
}

export async function navigateToArchive(page: Page): Promise<void> {
  await page.goto('/archive')
  await page.waitForLoadState('domcontentloaded')
}

export async function navigateToSettings(page: Page): Promise<void> {
  await page.goto('/settings')
  await page.waitForLoadState('domcontentloaded')
}

export async function openSearch(page: Page): Promise<void> {
  const dialog = page.locator('[role="dialog"], [cmdk-dialog]')
  // Retry keyboard shortcut — the event listener may not be attached yet
  for (let i = 0; i < 3; i++) {
    await page.locator('main, body').first().click({ force: true })
    await page.waitForTimeout(300)
    await page.keyboard.press('Meta+k')
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) break
  }
  await expect(dialog).toBeVisible({ timeout: 5000 })
}

export async function openQuickCapture(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog')
  for (let i = 0; i < 3; i++) {
    await page.locator('main, body').first().click({ force: true })
    await page.waitForTimeout(300)
    await page.keyboard.press('Meta+e')
    if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) break
  }
  await expect(dialog).toBeVisible({ timeout: 5000 })
}

// ---------------------------------------------------------------------------
// Tour helpers
// ---------------------------------------------------------------------------

/**
 * Dismisses the onboarding tutorial if it appears.
 * Safe to call even if the tutorial is not present.
 */
export async function dismissTourIfPresent(page: Page): Promise<void> {
  const skipButton = page.getByRole('button', { name: /skip/i })
  if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipButton.click()
  }
}
