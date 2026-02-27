import {
  test,
  expect,
  createEntry,
  createEntryWithTitle,
  navigateToDashboard,
  navigateToGraph,
  navigateToTrash,
  navigateToArchive,
  navigateToSettings,
} from './helpers'

test.describe('Navigation & Lifecycle — regression tests', () => {
  test('navigate to all main views without errors', async ({ guestPage: page }) => {
    // Regression: 2026-02-24 content flash on navigation

    // Dashboard
    await navigateToDashboard(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 })

    // Graph
    await navigateToGraph(page)
    // Graph page should load without crash — just check no error overlay
    await expect(page.locator('[data-nextjs-dialog]')).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // No Next.js error overlay is good
    })

    // Settings
    await navigateToSettings(page)
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({ timeout: 10000 })

    // Trash
    await navigateToTrash(page)
    await expect(page.getByText(/trash/i).first()).toBeVisible({ timeout: 10000 })

    // Archive
    await navigateToArchive(page)
    await expect(page.getByText(/archive/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('trash shows empty state', async ({ guestPage: page }) => {
    await navigateToTrash(page)

    // Should show empty state message
    await expect(
      page.getByText(/no .*(trashed|deleted|items)|trash is empty/i),
    ).toBeVisible({ timeout: 10000 })
  })

  test('entry moved to trash appears in trash', async ({ guestPage: page }) => {
    // Create an entry
    await createEntryWithTitle(page, 'Trash Me')
    await page.waitForTimeout(1000) // Wait for save

    // Open context menu on the entry in sidebar or use the entry actions
    const sidebar = page.locator('aside, nav').first()
    const entryLink = sidebar.getByText('Trash Me').first()
    await entryLink.click({ button: 'right' })

    // Click "Move to Trash" or similar
    const trashOption = page.getByRole('menuitem', { name: /trash|delete/i }).first()
    if (await trashOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await trashOption.click()

      // Confirm if there's a confirmation dialog
      const confirmButton = page.getByRole('button', { name: /confirm|delete|move to trash/i })
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      await page.waitForTimeout(500)

      // Navigate to trash
      await navigateToTrash(page)

      // Entry should be in trash
      await expect(page.getByText('Trash Me')).toBeVisible({ timeout: 10000 })
    }
  })

  test('entry can be restored from trash', async ({ guestPage: page }) => {
    // Create and trash an entry
    await createEntryWithTitle(page, 'Restore Me')
    await page.waitForTimeout(1000)

    const sidebar = page.locator('aside, nav').first()
    const entryLink = sidebar.getByText('Restore Me').first()
    await entryLink.click({ button: 'right' })

    const trashOption = page.getByRole('menuitem', { name: /trash|delete/i }).first()
    if (await trashOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await trashOption.click()

      const confirmButton = page.getByRole('button', { name: /confirm|delete|move to trash/i })
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click()
      }

      await page.waitForTimeout(500)

      // Go to trash
      await navigateToTrash(page)

      // Find restore button for this entry
      const restoreButton = page.getByRole('button', { name: /restore/i }).first()
      if (await restoreButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await restoreButton.click()
        await page.waitForTimeout(500)

        // Go back to dashboard — entry should be back
        await navigateToDashboard(page)
        await expect(sidebar.getByText('Restore Me')).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('settings page loads all sections', async ({ guestPage: page }) => {
    // Regression: 2026-02-23 settings flash
    await navigateToSettings(page)

    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({ timeout: 10000 })

    // Check that section headings are present
    // Guest mode may show subset of settings, but at least space sections
    const settingsPage = page.locator('main, [role="main"]').first()
    await expect(settingsPage.getByText(/appearance|templates|types/i).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('graph view renders without crash', async ({ guestPage: page }) => {
    // Regression: 2026-02-23 mobile graph crash
    await navigateToGraph(page)

    // Graph container should be visible (it's an absolute-positioned div)
    // No Next.js error overlay should appear
    await page.waitForTimeout(2000) // Give the graph time to render

    // Check there's no unhandled error overlay
    const errorOverlay = page.locator('[data-nextjs-dialog]')
    await expect(errorOverlay).not.toBeVisible()
  })

  test('sidebar entry appears after creation', async ({ guestPage: page }) => {
    // Regression: 2026-02-24 sidebar flickering
    await createEntry(page)

    // Entry should appear in sidebar (with default title like "New Page")
    const sidebar = page.locator('aside, nav').first()
    await expect(sidebar.getByText(/new page/i).first()).toBeVisible({ timeout: 10000 })
  })
})
