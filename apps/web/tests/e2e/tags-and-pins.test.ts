import {
  test,
  expect,
  createEntryWithTitle,
  addTagToEntry,
  removeTagFromEntry,
  pinCurrentEntry,
  unpinCurrentEntry,
  navigateToDashboard,
} from './helpers'

test.describe('Tags & Pins — regression tests', () => {
  test('create tag and assign to entry', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Tagged Entry')
    await page.waitForTimeout(500)

    await addTagToEntry(page, 'important')

    // TagBadge should be visible below the title
    const badge = page.locator('span').filter({ hasText: 'important' }).first()
    await expect(badge).toBeVisible()
  })

  test('tag appears in sidebar Tags section', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Sidebar Tag Entry')
    await page.waitForTimeout(500)

    await addTagToEntry(page, 'research')
    await page.waitForTimeout(500)

    // Navigate away and check sidebar
    await navigateToDashboard(page)

    const sidebar = page.locator('aside, nav').first()
    await expect(sidebar.getByText('research')).toBeVisible({ timeout: 10000 })
  })

  test('tag page shows tagged entry', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Tag Page Entry')
    await page.waitForTimeout(500)

    await addTagToEntry(page, 'mytag')
    await page.waitForTimeout(500)

    // Navigate to the tag page
    await page.goto('/tags/mytag', { waitUntil: 'domcontentloaded' })

    // Scope to main content to avoid matching sidebar entries
    const main = page.locator('#main-content, main').first()
    await expect(main.getByText('Tag Page Entry').first()).toBeVisible({ timeout: 10000 })
  })

  test('remove tag from entry', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Remove Tag Entry')
    await page.waitForTimeout(500)

    await addTagToEntry(page, 'temporary')
    await page.waitForTimeout(500)

    await removeTagFromEntry(page, 'temporary')

    // Badge should be gone from the editor area (tag may still exist in sidebar)
    const main = page.locator('#main-content, main').first()
    const badgeWithRemoveBtn = main.locator('span').filter({ hasText: 'temporary' }).filter({
      has: page.locator('button'),
    })
    await expect(badgeWithRemoveBtn).not.toBeVisible({ timeout: 5000 })
  })

  test('pin entry shows on dashboard Pinned section', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Pinned Entry')
    await page.waitForTimeout(500)

    await pinCurrentEntry(page)
    await page.waitForTimeout(500)

    // Navigate to dashboard
    await navigateToDashboard(page)

    // Find the Pinned section and check for the entry
    const pinnedSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Pinned', level: 2 }) })
    await expect(pinnedSection.getByText('Pinned Entry')).toBeVisible({ timeout: 10000 })
  })

  test('unpin removes from dashboard Pinned section', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Unpin Entry')
    await page.waitForTimeout(500)

    // Pin then unpin
    await pinCurrentEntry(page)
    await page.waitForTimeout(500)
    await unpinCurrentEntry(page)
    await page.waitForTimeout(500)

    // Navigate to dashboard
    await navigateToDashboard(page)

    // The entry should NOT be in the Pinned section
    const pinnedSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Pinned', level: 2 }) })
    await expect(pinnedSection.getByText('Unpin Entry')).not.toBeVisible({ timeout: 5000 })
  })

  test('pinned entry in sidebar Pinned section', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Sidebar Pin Entry')
    await page.waitForTimeout(500)

    await pinCurrentEntry(page)
    await page.waitForTimeout(500)

    // Navigate away to refresh sidebar
    await navigateToDashboard(page)

    // The sidebar should have a "Pinned" section containing the entry
    const sidebar = page.locator('aside, nav').first()
    const pinnedSection = sidebar.locator('#pinned-section-content')
    await expect(pinnedSection.getByText('Sidebar Pin Entry')).toBeVisible({ timeout: 10000 })
  })
})
