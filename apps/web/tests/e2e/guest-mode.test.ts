import { test, expect, type Page } from '@playwright/test'
import { enterGuestMode } from './helpers'

async function createObject(page: Page) {
  // Open the "Page options" dropdown in the sidebar
  const optionsButton = page.getByRole('button', { name: /page options/i })
  await optionsButton.click()
  // Click "Create" in the dropdown
  await page.getByRole('menuitem', { name: /^create$/i }).click()
  // Wait for navigation to the new object
  await page.waitForURL(/\/objects\//, { timeout: 10000 })
}

test.describe('Guest mode', () => {
  test('homepage loads in guest mode with welcome message', async ({ page }) => {
    await enterGuestMode(page)

    await expect(page.getByText('Welcome')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Guest').first()).toBeVisible()
  })

  test('create object from sidebar and see editor', async ({ page }) => {
    await enterGuestMode(page)

    await createObject(page)

    // The editor area should be present (use role=textbox for Slate editor)
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10000 })
  })

  test('sidebar shows created objects', async ({ page }) => {
    await enterGuestMode(page)

    await createObject(page)

    // After creation, the URL should contain the object id
    await expect(page).toHaveURL(/\/objects\//)

    // Navigate back to dashboard to see the sidebar with the listed object
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // The sidebar should have the created object (default title: "New Page")
    await expect(page.locator('span').filter({ hasText: /^New Page/ }).first()).toBeVisible({ timeout: 10000 })
  })
})
