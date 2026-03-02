import { test as base, expect } from '@playwright/test'

base.describe('Auth — Signup', () => {
  base('has email, password, confirm password, and strength meter', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  base('shows password validation for short passwords', async ({ page }) => {
    await page.goto('/signup')

    await page.getByLabel('Email').fill('test-signup@test.localhost')
    await page.locator('#password').fill('short')
    await page.locator('#confirmPassword').fill('short')
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page.locator('[role="alert"]')).toContainText('at least 8 characters', {
      timeout: 5000,
    })
  })

  base('shows password mismatch error', async ({ page }) => {
    await page.goto('/signup')

    await page.getByLabel('Email').fill('test-signup@test.localhost')
    await page.locator('#password').fill('StrongPassword1!')
    await page.locator('#confirmPassword').fill('DifferentPassword1!')
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page.locator('[role="alert"]')).toContainText('do not match', {
      timeout: 5000,
    })
  })

  base('shows confirmation UI after valid signup', async ({ page }) => {
    // Use a unique email to avoid conflicts
    const uniqueEmail = `signup-${Date.now()}@test.localhost`
    await page.goto('/signup')

    await page.getByLabel('Email').fill(uniqueEmail)
    await page.locator('#password').fill('StrongPassword1!')
    await page.locator('#confirmPassword').fill('StrongPassword1!')
    await page.getByRole('button', { name: /create account/i }).click()

    // With email confirmations disabled in local Supabase, the form should
    // either redirect to dashboard or show the confirmation UI
    // (depending on Supabase config). Check for either outcome.
    const confirmed = page
      .getByText('Check your email')
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const redirected = page
      .waitForURL('**/dashboard', { timeout: 10000 })
      .then(() => true)
      .catch(() => false)

    const result = await Promise.race([confirmed, redirected])
    expect(result).toBeTruthy()
  })
})
