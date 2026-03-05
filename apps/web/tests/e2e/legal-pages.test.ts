import { test, expect } from '@playwright/test'

test.describe('Public legal pages', () => {
  test('privacy policy page renders with required sections', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.getByRole('heading', { name: /privacy policy/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /legal basis for processing/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /your rights/i })).toBeVisible()
    await expect(page.getByText(/contractual necessity/i)).toBeVisible()
    await expect(page.getByText(/right to erasure/i)).toBeVisible()
  })

  test('terms of service page renders', async ({ page }) => {
    await page.goto('/terms')

    await expect(page.getByRole('heading', { name: /terms of service/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /your content/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /acceptable use/i })).toBeVisible()
  })
})
