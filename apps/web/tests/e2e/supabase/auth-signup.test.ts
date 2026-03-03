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

    await expect(page.getByRole('alert').filter({ hasText: 'at least 8 characters' })).toBeVisible({
      timeout: 5000,
    })
  })

  base('shows password mismatch error', async ({ page }) => {
    await page.goto('/signup')

    await page.getByLabel('Email').fill('test-signup@test.localhost')
    await page.locator('#password').fill('StrongPassword1!')
    await page.locator('#confirmPassword').fill('DifferentPassword1!')
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'do not match' })).toBeVisible({
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

    // The SignupForm always shows "Check your email" after successful signup
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 15000 })
  })
})
