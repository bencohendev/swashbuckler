import * as path from 'node:path'
import { test, expect } from '../auth-helpers'

test.describe('Auth — Logout', () => {
  test('signs out via account menu', async ({ authPage }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL('**/dashboard', { timeout: 15000 })

    // Open account menu and click sign out
    await authPage.getByLabel('Account menu').click()
    await authPage.getByRole('menuitem', { name: /sign out/i }).click()

    // Should redirect to login
    await authPage.waitForURL('**/login', { timeout: 15000 })
  })

  test('clears session after logout', async ({ authPage }) => {
    await authPage.goto('/dashboard')
    await authPage.waitForURL('**/dashboard', { timeout: 15000 })

    // Sign out
    await authPage.getByLabel('Account menu').click()
    await authPage.getByRole('menuitem', { name: /sign out/i }).click()
    await authPage.waitForURL('**/login', { timeout: 15000 })

    // Trying to visit a protected page should redirect to login
    await authPage.goto('/dashboard')
    await authPage.waitForURL('**/login', { timeout: 15000 })
  })

  test('clears guest cookie on logout', async ({ browser }) => {
    const storagePath = path.join(__dirname, '..', '..', '.auth', 'userA.json')
    const context = await browser.newContext({ storageState: storagePath })
    const page = await context.newPage()

    // Set a guest cookie (simulating a user who was previously in guest mode)
    await context.addCookies([
      { name: 'swashbuckler-guest', value: '1', domain: 'localhost', path: '/' },
    ])

    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard', { timeout: 15000 })

    // Sign out
    await page.getByLabel('Account menu').click()
    await page.getByRole('menuitem', { name: /sign out/i }).click()
    await page.waitForURL('**/login', { timeout: 15000 })

    // Guest cookie should be cleared
    const cookies = await context.cookies()
    const guestCookie = cookies.find((c) => c.name === 'swashbuckler-guest')
    expect(guestCookie).toBeUndefined()

    await context.close()
  })
})
