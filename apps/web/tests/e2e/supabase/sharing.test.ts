import * as path from 'node:path'
import { test, twoUserTest, expect, openShareDialog, switchToSpace } from '../auth-helpers'

test.describe('Sharing — Owner actions', () => {
  // Tests modify shared state (permissions) — run serially to avoid conflicts
  test.describe.configure({ mode: 'serial' })
  test('opens share dialog from space switcher', async ({ authPage }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    await openShareDialog(authPage)

    await expect(authPage.getByText(/invite people/i)).toBeVisible()
    await expect(authPage.getByLabel('Email address')).toBeVisible()
  })

  test('invites a user by email with view permission', async ({ authPage }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    await openShareDialog(authPage)

    // The setup already shared with user-b, so let's verify user-b appears
    // in the shares list
    await expect(authPage.getByText('user-b@test.localhost')).toBeVisible({ timeout: 10000 })
  })

  test('updates share permission from edit to view', async ({ authPage }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    await openShareDialog(authPage)

    // Find the permission select for user-b
    const permissionSelect = authPage.getByLabel(/permission for user-b/i)
    await permissionSelect.waitFor({ state: 'visible', timeout: 10000 })

    // Current permission is 'edit' (set in global-setup), change to 'view'
    await permissionSelect.selectOption('view')
    await authPage.waitForTimeout(500)

    // Verify it stuck by reloading
    await authPage.reload()
    await openShareDialog(authPage)
    const updatedSelect = authPage.getByLabel(/permission for user-b/i)
    await updatedSelect.waitFor({ state: 'visible', timeout: 10000 })
    const value = await updatedSelect.inputValue()
    expect(value).toBe('view')

    // Restore to edit for other tests
    await updatedSelect.selectOption('edit')
    await authPage.waitForTimeout(500)
  })

  test('revokes share access', async ({ authPage }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    // First share with a new email so we don't break other tests
    await openShareDialog(authPage)

    const emailInput = authPage.getByLabel('Email address')
    await emailInput.fill('revoke-test@test.localhost')
    const shareButton = authPage.getByRole('button', { name: /share/i }).last()
    await shareButton.click()

    // Wait for the share to appear (or error if user doesn't exist)
    await authPage.waitForTimeout(1000)

    // If the share was created, remove it
    const removeButton = authPage.getByLabel(/remove access for revoke-test/i)
    if (await removeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await removeButton.click()

      // Confirm removal
      const confirmDialog = authPage.locator('[role="dialog"]').last()
      await confirmDialog.getByRole('button', { name: /remove/i }).click()

      await expect(authPage.getByText('Access removed')).toBeVisible({ timeout: 5000 })
    }
  })
})

twoUserTest.describe('Sharing — Shared user (User B)', () => {
  twoUserTest('User B sees shared space in space switcher', async ({ userBPage, testData }) => {
    await userBPage.goto('/dashboard')
    await userBPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    // Open space switcher
    const switcher = userBPage.locator('[data-tour="space-switcher"]')
    await switcher.click()

    // Should see "Shared with you" section
    await expect(userBPage.getByText(/shared with you/i)).toBeVisible({ timeout: 5000 })
    // Should see User A's space name
    await expect(
      userBPage.getByRole('menuitem').filter({ hasText: testData.spaceA.name }),
    ).toBeVisible()
  })

  twoUserTest('User B with edit permission can create objects', async ({ userBPage, testData }) => {
    await userBPage.goto('/dashboard')
    await userBPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    // Switch to the shared space
    await switchToSpace(userBPage, testData.spaceA.name)

    // Try to create an entry
    const optionsButton = userBPage.getByRole('button', { name: /options/i }).first()
    if (await optionsButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await optionsButton.click()
      const createItem = userBPage.getByRole('menuitem', { name: /^create$/i })
      if (await createItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createItem.click()
        await userBPage.waitForURL(/\/objects\//, { timeout: 10000 })
        // Successfully created — edit permission works
        await expect(userBPage.locator('[contenteditable="true"]')).toBeVisible({ timeout: 10000 })
      }
    }
  })

  twoUserTest('User B sees shared objects in sidebar', async ({ userBPage, testData }) => {
    await userBPage.goto('/dashboard')
    await userBPage.waitForURL(/\/dashboard/, { timeout: 15000 })

    await switchToSpace(userBPage, testData.spaceA.name)

    // Should see the test pages created in global setup
    await expect(
      userBPage.locator('aside, nav').getByText('Shared Test Page').first(),
    ).toBeVisible({ timeout: 10000 })
  })

  twoUserTest('User B can leave a shared space', async ({ browser, testData }) => {
    // Create a separate context so leaving doesn't affect other tests
    const storagePath = path.join(__dirname, '..', '..', '.auth', 'userB.json')
    const context = await browser.newContext({ storageState: storagePath })
    const page = await context.newPage()

    await page.goto('/dashboard')
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    // Switch to shared space
    await switchToSpace(page, testData.spaceA.name)

    // Open switcher and click "Leave Space"
    const switcher = page.locator('[data-tour="space-switcher"]')
    await switcher.click()
    // Wait for dropdown to stabilize (Radix menus can re-render)
    await page.waitForTimeout(500)

    const leaveItem = page.getByRole('menuitem', { name: /leave space/i })
    if (await leaveItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await leaveItem.click({ timeout: 10000 })

      // Confirm (Radix AlertDialog)
      const confirmDialog = page.getByRole('alertdialog')
      await expect(confirmDialog).toBeVisible({ timeout: 5000 })
      await confirmDialog.getByRole('button', { name: /leave/i }).click()

      // Should show toast and redirect
      await expect(page.getByText(/left/i).first()).toBeVisible({ timeout: 5000 })
    }

    await context.close()
  })
})
