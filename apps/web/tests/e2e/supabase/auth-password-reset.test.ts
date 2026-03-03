import { test as base, expect } from '@playwright/test'
import { test } from '../auth-helpers'

base.describe('Auth — Password Reset (unauthenticated)', () => {
  base('forgot-password form submits and shows confirmation', async ({ page }) => {
    await page.goto('/forgot-password')

    await expect(page.getByText('Reset your password')).toBeVisible()
    // Use a valid email domain — remote Supabase rejects .localhost as invalid
    await page.getByLabel('Email').fill('reset-test@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()

    // Should show "Check your email" confirmation
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible()
  })

  base('forgot-password page has email field and submit button', async ({ page }) => {
    await page.goto('/forgot-password')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible()
  })
})

test.describe('Auth — Reset Password page', () => {
  test('shows reset form when session is valid', async ({ authPage }) => {
    await authPage.goto('/reset-password')

    // Authenticated user should see the reset form
    await expect(authPage.getByText('Set a new password')).toBeVisible({ timeout: 10000 })
    await expect(authPage.locator('#password')).toBeVisible()
    await expect(authPage.locator('#confirmPassword')).toBeVisible()
  })
})
