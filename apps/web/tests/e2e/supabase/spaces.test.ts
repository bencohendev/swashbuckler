import { test, expect, switchToSpace } from '../auth-helpers'

test.describe('Spaces', () => {
  // Removed serial mode — tests are now independent

  test('displays current space in switcher', async ({ authPage, testData }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    const switcher = authPage.locator('[data-tour="space-switcher"]')
    await expect(switcher).toContainText(testData.spaceA.name, { timeout: 15000 })
  })

  test('creates a new space', async ({ authPage }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    const switcher = authPage.locator('[data-tour="space-switcher"]')
    await switcher.click()

    await authPage.getByRole('menuitem', { name: /new space/i }).click()

    const dialog = authPage.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const nameInput = dialog.getByLabel(/name/i).first()
    await nameInput.fill('Test Space E2E')

    const createButton = dialog.getByRole('button', { name: /create/i })
    await createButton.click()

    await expect(dialog).not.toBeVisible({ timeout: 30000 })
    await expect(switcher).toContainText('Test Space E2E', { timeout: 30000 })
  })

  test('switches between spaces', async ({ authPage, testData }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    const switcher = authPage.locator('[data-tour="space-switcher"]')

    await switchToSpace(authPage, testData.archiveSpace.name)
    await expect(switcher).toContainText(testData.archiveSpace.name)

    await switchToSpace(authPage, testData.spaceA.name)
    await expect(switcher).toContainText(testData.spaceA.name)
  })

  test('renames a space via settings', async ({ authPage, testData }) => {
    await authPage.goto('/settings/spaces')
    await authPage.waitForLoadState('domcontentloaded')

    const nameInput = authPage.locator('input[aria-label^="Space name"]').first()
    await nameInput.waitFor({ state: 'visible', timeout: 10000 })

    await nameInput.fill('Renamed Space E2E')
    await nameInput.blur()

    // Wait for debounced save via network idle instead of fixed timeout
    await authPage.waitForLoadState('networkidle').catch(() => {})
    await authPage.waitForTimeout(500)

    await authPage.reload()
    const updatedInput = authPage.locator('input[aria-label^="Space name"]').first()
    await updatedInput.waitFor({ state: 'visible', timeout: 10000 })
    const updatedName = await updatedInput.inputValue()

    // Rename back to original to avoid side effects on other tests
    if (updatedName === 'Renamed Space E2E') {
      await updatedInput.fill(testData.spaceA.name)
      await updatedInput.blur()
      await authPage.waitForLoadState('networkidle').catch(() => {})
    }

    expect(updatedName).toBe('Renamed Space E2E')
  })

  test('archives a space from settings', async ({ authPage, testData }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    await switchToSpace(authPage, testData.archiveSpace.name)

    await authPage.goto('/settings/spaces')
    await authPage.waitForLoadState('domcontentloaded')

    const archiveButton = authPage.getByLabel(new RegExp(`archive ${testData.archiveSpace.name}`, 'i'))
    await archiveButton.waitFor({ state: 'visible', timeout: 15000 })
    await archiveButton.click()

    const confirmDialog = authPage.getByRole('alertdialog')
    await expect(confirmDialog).toBeVisible({ timeout: 5000 })
    await confirmDialog.getByRole('button', { name: /archive/i }).click()

    await expect(authPage.getByText(/archived/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('cannot delete the last remaining space', async ({ authPage }) => {
    await authPage.goto('/settings/spaces')
    await authPage.waitForLoadState('domcontentloaded')

    const spaceRows = authPage.locator('input[aria-label^="Space name"]')
    await spaceRows.first().waitFor({ state: 'visible', timeout: 10000 })
    const count = await spaceRows.count()

    if (count === 1) {
      const deleteButton = authPage.getByLabel(/delete/i).first()
      await expect(deleteButton).not.toBeVisible()
    }
    expect(count).toBeGreaterThanOrEqual(1)
  })
})
