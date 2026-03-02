import { test, expect } from '../auth-helpers'
import { test as base } from '@playwright/test'

test.describe('Auth — Login', () => {
  test('logs in with valid email and password', async ({ authPage }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL('**/dashboard', { timeout: 15000 })

    // Should see the sidebar and header (authenticated state)
    await expect(authPage.locator('aside, nav').first()).toBeVisible({ timeout: 10000 })
    // Account menu should show email, not "Guest"
    await authPage.getByLabel('Account menu').click()
    await expect(authPage.getByText('user-a@test.localhost')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('wrong@test.localhost')
    await page.locator('#password').fill('WrongPassword1!')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 })
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

    // Should show rate limiting message
    await expect(page.getByRole('status')).toContainText(/wait.*seconds/i, {
      timeout: 5000,
    })
  })

  test('shows banner for session_expired query param', async ({ page }) => {
    await page.goto('/login?expired=true')

    await expect(page.getByRole('alert')).toContainText('session has expired', {
      timeout: 5000,
    })
  })

  test('shows banner for oauth_denied error param', async ({ page }) => {
    await page.goto('/login?error=oauth_denied')

    await expect(page.getByRole('alert')).toContainText('cancelled', {
      timeout: 5000,
    })
  })

  test('shows banner for oauth_error param', async ({ page }) => {
    await page.goto('/login?error=oauth_error')

    await expect(page.getByRole('alert')).toContainText('went wrong', {
      timeout: 5000,
    })
  })

  test('clears guest cookie on successful login', async ({ browser, testData }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Set guest cookie
    await context.addCookies([
      { name: 'swashbuckler-guest', value: '1', domain: 'localhost', path: '/' },
    ])

    await page.goto('/login')
    await page.getByLabel('Email').fill(testData.userA.email)
    await page.locator('#password').fill('TestPassword1!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL('**/dashboard', { timeout: 30000 })

    // Guest cookie should be cleared
    const cookies = await context.cookies()
    const guestCookie = cookies.find((c) => c.name === 'swashbuckler-guest')
    expect(guestCookie).toBeUndefined()

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
