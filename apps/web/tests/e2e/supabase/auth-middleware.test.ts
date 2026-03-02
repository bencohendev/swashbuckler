import { test } from '../auth-helpers'
import { test as base } from '@playwright/test'

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

  test('redirects /forgot-password to /dashboard for authenticated user', async ({ authPage }) => {
    await authPage.goto('/forgot-password')
    await authPage.waitForURL('**/dashboard', { timeout: 15000 })
  })
})

base.describe('Auth Middleware — Unauthenticated', () => {
  base('redirects /dashboard to /login without session', async ({ page }) => {
    // Clear any cookies to ensure no auth or guest session
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await page.waitForURL('**/login', { timeout: 15000 })
  })

  base('redirects /settings to /login without session', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/settings')
    await page.waitForURL('**/login', { timeout: 15000 })
  })
})
