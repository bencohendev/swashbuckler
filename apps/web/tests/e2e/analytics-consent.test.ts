import { test, expect } from '@playwright/test'
import { ANALYTICS_CONSENT_KEY } from './helpers'

test.describe('Analytics consent banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/landing')
    await page.evaluate((key) => localStorage.removeItem(key), ANALYTICS_CONSENT_KEY)
  })

  test('banner appears on first visit', async ({ page }) => {
    await page.goto('/landing')

    await expect(page.getByText(/anonymous analytics/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /ok/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /decline/i })).toBeVisible()
  })

  test('accepting hides banner and persists across reload', async ({ page }) => {
    await page.goto('/landing')

    await page.getByRole('button', { name: /ok/i }).click()

    // Banner text should disappear
    await expect(page.getByText(/anonymous analytics/i)).not.toBeVisible()

    // Reload and confirm banner stays hidden
    await page.reload()
    await expect(page.getByText(/anonymous analytics/i)).not.toBeVisible()

    // Verify localStorage value
    const consent = await page.evaluate((key) => localStorage.getItem(key), ANALYTICS_CONSENT_KEY)
    expect(consent).toBe('accepted')
  })

  test('declining hides banner and persists across reload', async ({ page }) => {
    await page.goto('/landing')

    await page.getByRole('button', { name: /decline/i }).click()

    await expect(page.getByText(/anonymous analytics/i)).not.toBeVisible()

    // Reload and confirm banner stays hidden
    await page.reload()
    await expect(page.getByText(/anonymous analytics/i)).not.toBeVisible()

    const consent = await page.evaluate((key) => localStorage.getItem(key), ANALYTICS_CONSENT_KEY)
    expect(consent).toBe('declined')
  })

  test('banner includes link to privacy policy', async ({ page }) => {
    await page.goto('/landing')

    const link = page.getByRole('link', { name: /privacy policy/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/privacy')
  })
})

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
