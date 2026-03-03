import { test as base, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { USER_A_EMAIL, USER_A_PASSWORD } from '../global-setup'

const AUTH_DIR = path.join(__dirname, '..', '..', '.auth')
const TEST_DATA_PATH = path.join(AUTH_DIR, 'test-data.json')

/**
 * Helper: log in via the browser and return the page (creates an isolated session).
 * Logout tests MUST use their own sessions — Supabase's signOut({ scope: 'global' })
 * revokes the server-side session, which would invalidate shared storageState tokens
 * used by other tests.
 */
async function loginFresh(browser: import('@playwright/test').Browser) {
  const context = await browser.newContext()

  // Pre-set tutorial as completed BEFORE any page loads so the Zustand store
  // reads the correct value at creation time (it reads localStorage once on init)
  await context.addInitScript(() => {
    localStorage.setItem('swashbuckler:tutorialCompleted', 'true')
  })

  const page = await context.newPage()
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 15000 })
  await page.getByLabel('Email').fill(USER_A_EMAIL)
  await page.locator('#password').fill(USER_A_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard', { timeout: 30000 })

  // After client-side login, the auth cookie may not be ready for the first
  // server render (router.push fires before the cookie setter completes).
  // If the page lands in guest mode, reload to pick up the session cookie.
  const welcomeBack = page.getByText('Welcome back')
  if (!(await welcomeBack.isVisible({ timeout: 5000 }).catch(() => false))) {
    await page.reload()
  }
  await expect(welcomeBack).toBeVisible({ timeout: 15000 })

  return { page, context }
}

base.describe('Auth — Logout', () => {
  base.beforeEach(({}, testInfo) => {
    if (!fs.existsSync(TEST_DATA_PATH)) {
      testInfo.skip(true, 'Supabase not running — skipping')
    }
  })

  base('signs out via account menu', async ({ browser }) => {
    const { page, context } = await loginFresh(browser)

    // Open account menu and click sign out
    await page.getByLabel('Account menu').click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 15000 })

    await context.close()
  })

  base('clears session after logout', async ({ browser }) => {
    const { page, context } = await loginFresh(browser)

    // Verify we're authenticated — user email is visible
    await expect(page.getByText(USER_A_EMAIL)).toBeVisible({ timeout: 10000 })

    // Sign out
    await page.getByLabel('Account menu').click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    await page.waitForURL('**/login', { timeout: 15000 })

    // Visiting dashboard after logout enters guest mode (not redirected to login)
    await page.goto('/dashboard')
    await expect(page.getByText(/guest mode/i)).toBeVisible({ timeout: 15000 })

    await context.close()
  })

  base('shows login page after logout', async ({ browser }) => {
    const { page, context } = await loginFresh(browser)

    // Sign out
    await page.getByLabel('Account menu').click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    await page.waitForURL('**/login', { timeout: 15000 })

    // Should be on the login page
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

    await context.close()
  })
})
