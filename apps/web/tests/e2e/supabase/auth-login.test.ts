import { test, expect } from '../auth-helpers'
import { test as base } from '@playwright/test'

test.describe('Auth — Login', () => {
  test('logs in with valid email and password', async ({ authPage, testData }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL('**/dashboard', { timeout: 15000 })

    // Should see the sidebar (authenticated state)
    await expect(authPage.locator('aside').first()).toBeVisible({ timeout: 15000 })
    // Should see the authenticated user's email on the page
    await expect(authPage.getByText(testData.userA.email)).toBeVisible({ timeout: 10000 })
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('wrong@test.localhost')
    await page.locator('#password').fill('WrongPassword1!')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Error text appears below the form
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10000 })
  })

  test('shows error for empty password', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('user-a@test.localhost')
    // Don't fill password — form validation should prevent submission
    const button = page.getByRole('button', { name: 'Sign in' })
    await button.click()

    // The HTML required attribute should prevent form submission
    const passwordInput = page.locator('#password')
    const isRequired = await passwordInput.getAttribute('required')
    expect(isRequired).not.toBeNull()
  })

  test('rate limits after multiple failed attempts', async ({ page }) => {
    await page.goto('/login')

    // Submit 5 failed login attempts rapidly
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Email').fill('wrong@test.localhost')
      await page.locator('#password').fill('WrongPassword1!')
      await page.getByRole('button', { name: /sign in|try again/i }).click()
      // Wait for the error to appear before next attempt
      await page.waitForTimeout(500)
    }

    // Should show rate limiting message (use getByText to avoid matching the analytics consent banner)
    await expect(page.getByText(/wait.*seconds/i)).toBeVisible({
      timeout: 5000,
    })
  })

  test('logs in from a fresh browser session', async ({ browser, testData }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/login')
    await page.getByLabel('Email').fill(testData.userA.email)
    await page.locator('#password').fill('TestPassword1!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/dashboard', { timeout: 30000 })

    // Should see the authenticated dashboard
    await expect(page.getByText(testData.userA.email)).toBeVisible({ timeout: 10000 })

    await context.close()
  })
})

// Test that doesn't need auth fixtures — uses base test
base.describe('Auth — Login (unauthenticated)', () => {
  base('has email, password fields, sign-in button, and forgot-password link', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })
})
