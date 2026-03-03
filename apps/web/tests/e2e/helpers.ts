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
    // Dismiss the onboarding tutorial and analytics consent banner via localStorage before navigating
    await page.goto('/dashboard', { waitUntil: 'commit' })
    await page.evaluate(() => {
      localStorage.setItem('swashbuckler:tutorialCompleted', 'true')
      localStorage.setItem('swashbuckler:analyticsConsent', 'accepted')
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
// More options / toast helpers
// ---------------------------------------------------------------------------

/** Opens the "More options" dropdown on the current entry's editor. */
export async function openMoreMenu(page: Page): Promise<void> {
  const btn = page.locator('button[aria-label="More options"]')
  await btn.click()
  // Wait for dropdown to appear
  await expect(page.getByRole('menuitem').first()).toBeVisible({ timeout: 5000 })
}

/** Wait for a toast notification containing the given text. */
export async function waitForToast(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 5000 })
}

// ---------------------------------------------------------------------------
// Tag helpers
// ---------------------------------------------------------------------------

/**
 * Adds a tag to the current entry. Creates the tag if it doesn't exist.
 * Must be on an object editor page.
 */
export async function addTagToEntry(page: Page, tagName: string): Promise<void> {
  // Click the "+ Tag" button (dashed border button with "Tag" text)
  const tagButton = page.locator('button').filter({ hasText: /^Tag$/ }).first()
  await tagButton.click()

  // Type the tag name in the search input
  const searchInput = page.locator('input[placeholder="Search or create..."]')
  await searchInput.waitFor({ state: 'visible', timeout: 5000 })
  await searchInput.fill(tagName)

  // Click "Create" if the tag doesn't exist, or click the matching tag
  const createBtn = page.getByText(`Create \u201c${tagName}\u201d`)
  const existingTag = page.locator('button').filter({ hasText: tagName }).first()

  if (await createBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await createBtn.click()
  } else {
    await existingTag.click()
  }

  // Wait for the TagBadge to appear
  await expect(page.locator('span').filter({ hasText: tagName }).first()).toBeVisible({
    timeout: 5000,
  })
}

/**
 * Removes a tag from the current entry by clicking its X button.
 */
export async function removeTagFromEntry(page: Page, tagName: string): Promise<void> {
  // Close any open popover first (e.g., the tag picker)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // TagBadge renders: <span>name <button><XIcon /></button></span>
  // The badge with an X button only exists in the editor area (not sidebar)
  const mainContent = page.locator('#main-content, main').first()
  const badge = mainContent.locator('span').filter({ hasText: tagName }).filter({
    has: page.locator('button'),
  }).first()
  await badge.waitFor({ state: 'visible', timeout: 5000 })
  const removeBtn = badge.locator('button')
  await removeBtn.click()

  // Wait for the badge to disappear
  await expect(badge).not.toBeVisible({ timeout: 5000 })
}

// ---------------------------------------------------------------------------
// Pin helpers
// ---------------------------------------------------------------------------

/** Pins the current entry by clicking the Pin button in the editor header. */
export async function pinCurrentEntry(page: Page): Promise<void> {
  const main = page.locator('#main-content, main').first()
  const btn = main.locator('button[title="Pin"]')
  await btn.click()
  await expect(main.locator('button[title="Unpin"]')).toBeVisible({ timeout: 5000 })
}

/** Unpins the current entry by clicking the Unpin button in the editor header. */
export async function unpinCurrentEntry(page: Page): Promise<void> {
  const main = page.locator('#main-content, main').first()
  const btn = main.locator('button[title="Unpin"]')
  await btn.click()
  await expect(main.locator('button[title="Pin"]')).toBeVisible({ timeout: 5000 })
}

// ---------------------------------------------------------------------------
// Archive helpers
// ---------------------------------------------------------------------------

/** Archives the current entry via the More options menu. */
export async function archiveCurrentEntry(page: Page): Promise<void> {
  await openMoreMenu(page)
  const archiveItem = page.getByRole('menuitem', { name: 'Archive' })
  await archiveItem.click()
  await waitForToast(page, 'Archived')
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

/** Saves the current entry as a template via the More options menu. */
export async function saveAsTemplate(page: Page, name: string): Promise<void> {
  await openMoreMenu(page)
  const saveItem = page.getByRole('menuitem', { name: 'Save as Template' })
  await saveItem.click()

  // Fill the template name in the dialog
  const nameInput = page.locator('input#template-name')
  await nameInput.waitFor({ state: 'visible', timeout: 5000 })
  await nameInput.fill(name)

  // Click Save
  const saveBtn = page.locator('button[type="submit"]').filter({ hasText: 'Save' })
  await saveBtn.click()

  // Wait for dialog to close
  await expect(nameInput).not.toBeVisible({ timeout: 5000 })
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
