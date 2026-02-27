import {
  test,
  expect,
  createEntryWithTitle,
  navigateToDashboard,
  navigateToArchive,
  archiveCurrentEntry,
} from './helpers'

test.describe('Dashboard & Archive — regression tests', () => {
  test('dashboard has Pinned and Recent sections', async ({ guestPage: page }) => {
    await navigateToDashboard(page)

    await expect(page.getByRole('heading', { name: 'Pinned', level: 2 })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole('heading', { name: 'Recent', level: 2 })).toBeVisible({
      timeout: 10000,
    })
  })

  test('recent section shows created entry', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Recent Entry')
    await page.waitForTimeout(1000) // Wait for save

    await navigateToDashboard(page)

    const recentSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Recent', level: 2 }),
    })
    await expect(recentSection.getByText('Recent Entry')).toBeVisible({ timeout: 10000 })
  })

  test('pinned section shows empty state', async ({ guestPage: page }) => {
    await navigateToDashboard(page)

    await expect(page.getByText('No pinned entries')).toBeVisible({ timeout: 10000 })
  })

  test('archive entry via editor menu', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Archive Me')
    await page.waitForTimeout(1000)

    await archiveCurrentEntry(page)

    // Should navigate away (to dashboard)
    await page.waitForURL(/\/(dashboard|types)/, { timeout: 10000 })

    // Entry should be on archive page
    await navigateToArchive(page)
    await expect(page.getByText('Archive Me')).toBeVisible({ timeout: 10000 })
  })

  test('unarchive entry from archive page', async ({ guestPage: page }) => {
    // Create and archive an entry
    await createEntryWithTitle(page, 'Unarchive Me')
    await page.waitForTimeout(1000)

    await archiveCurrentEntry(page)
    await page.waitForURL(/\/(dashboard|types)/, { timeout: 10000 })

    // Go to archive
    await navigateToArchive(page)
    await expect(page.getByText('Unarchive Me')).toBeVisible({ timeout: 10000 })

    // Click the unarchive button
    const unarchiveBtn = page.getByRole('button', { name: /unarchive/i }).first()
    await unarchiveBtn.click()

    await page.waitForTimeout(1000)

    // The unarchive button for this entry should be gone from the archive page
    const main = page.locator('#main-content, main').first()
    await expect(
      main.getByRole('button', { name: /unarchive.*Unarchive Me/i }),
    ).not.toBeVisible({ timeout: 5000 })
  })

  test('archive page shows empty state', async ({ guestPage: page }) => {
    await navigateToArchive(page)

    await expect(page.getByText('Archive is empty')).toBeVisible({ timeout: 10000 })
  })
})
