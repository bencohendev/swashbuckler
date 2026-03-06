import { test } from '../auth-helpers'
import { test as base, expect } from '@playwright/test'

test.describe('Auth Middleware — Authenticated', () => {
  test('redirects / to /dashboard for authenticated user', async ({ authPage }) => {
    await authPage.goto('/')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })
  })

  test('redirects /login to /dashboard for authenticated user', async ({ authPage }) => {
    await authPage.goto('/login')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })
  })

  test('redirects /signup to /dashboard for authenticated user', async ({ authPage }) => {
    await authPage.goto('/signup')
    await authPage.waitForURL(/\/dashboard/, { timeout: 15000 })
  })
})

base.describe('Auth Middleware — Unauthenticated', () => {
  base('/ redirects to /landing without session or guest cookie', async ({ page }) => {
    // Clear any cookies to ensure no auth or guest session
    await page.context().clearCookies()
    await page.goto('/')
    await page.waitForURL('**/landing', { timeout: 15000 })
  })

  base('/dashboard with guest cookie loads in guest mode', async ({ page }) => {
    // Clear any existing cookies, then set the guest cookie to opt in
    await page.context().clearCookies()
    await page.context().addCookies([{
      name: 'swashbuckler-guest',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // Guest mode should load the dashboard with a Welcome heading
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible({ timeout: 15000 })
  })
})
