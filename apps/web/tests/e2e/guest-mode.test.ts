import { test, expect } from '@playwright/test'

test.describe('Guest mode', () => {
  test('homepage loads in guest mode with welcome message', async ({ page }) => {
    await page.goto('/')

    // Guest mode shows a welcome message
    await expect(page.getByText('Welcome')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/guest/i)).toBeVisible()
  })

  test('create object from sidebar and see it in list', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for a "New" or create button in the sidebar
    const newButton = page.getByRole('button', { name: /new/i }).first()
    await newButton.click()

    // Should create an object and navigate to it, or show it in the sidebar
    // Wait for the editor or object view to appear
    await expect(page.locator('[data-testid="object-editor"], [contenteditable]')).toBeVisible({ timeout: 10000 })
  })

  test('navigate to object and see editor', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Create an object first
    const newButton = page.getByRole('button', { name: /new/i }).first()
    await newButton.click()

    // Wait for navigation to object page
    await page.waitForURL(/\/objects\//, { timeout: 10000 })

    // The editor area should be present
    await expect(page.locator('[contenteditable], [data-testid="object-editor"]')).toBeVisible({ timeout: 10000 })
  })

  test('sidebar shows created objects', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Create an object
    const newButton = page.getByRole('button', { name: /new/i }).first()
    await newButton.click()

    // Wait for it to appear
    await page.waitForURL(/\/objects\//, { timeout: 10000 })

    // The sidebar should have the object listed
    const sidebar = page.locator('aside, [data-testid="sidebar"], nav')
    await expect(sidebar.getByText(/untitled|new page/i).first()).toBeVisible({ timeout: 5000 })
  })
})
