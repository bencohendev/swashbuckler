import { test } from '../auth-helpers'
import { test as base, expect } from '@playwright/test'

test.describe('Auth Middleware — Authenticated', () => {
  test('redirects / to /dashboard for authenticated user', async ({ authPage }) => {
    await authPage.goto('/')
    await authPage.waitForURL('**/dashboard', { timeout: 15000 })
  })

  test('redirects /login to /dashboard for authenticated user', async ({ authPage }) => {
    await authPage.goto('/login')
    await authPage.waitForURL('**/dashboard', { timeout: 15000 })
  })

  test('redirects /signup to /dashboard for authenticated user', async ({ authPage }) => {
    await authPage.goto('/signup')
    await authPage.waitForURL('**/dashboard', { timeout: 15000 })
  })
})

base.describe('Auth Middleware — Unauthenticated', () => {
  base('/ redirects to /landing without session or guest cookie', async ({ page }) => {
    // Clear any cookies to ensure no auth or guest session
    await page.context().clearCookies()
    await page.goto('/')
    await page.waitForURL('**/landing', { timeout: 15000 })
  })

  base('/dashboard loads without redirect for unauthenticated user', async ({ page }) => {
    // Clear any cookies
    await page.context().clearCookies()
    await page.goto('/dashboard')

    // The app enters guest mode (no redirect to /login — guest mode allows access)
    // Verify the dashboard loaded by checking the URL stayed on /dashboard
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/dashboard')
  })
})
