import { test as setup, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  USER_A_EMAIL,
  USER_A_PASSWORD,
  USER_B_EMAIL,
  USER_B_PASSWORD,
} from './global-setup'
import { ANALYTICS_CONSENT_KEY } from './helpers'

const AUTH_DIR = path.join(__dirname, '..', '.auth')

const users = [
  { email: USER_A_EMAIL, password: USER_A_PASSWORD, filename: 'userA.json' },
  { email: USER_B_EMAIL, password: USER_B_PASSWORD, filename: 'userB.json' },
]

for (const { email, password, filename } of users) {
  setup(`authenticate ${email}`, async ({ page, context }) => {
    const testDataPath = path.join(AUTH_DIR, 'test-data.json')
    setup.skip(!fs.existsSync(testDataPath), 'Supabase not running — skipping auth setup')

    // Dismiss analytics consent banner and tutorial before login
    await page.goto('/login', { waitUntil: 'commit' })
    await page.evaluate((key) => {
      localStorage.setItem(key, 'accepted')
      localStorage.setItem('swashbuckler:tutorialCompleted', 'true')
    }, ANALYTICS_CONSENT_KEY)

    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 15000 })

    await page.getByLabel('Email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL('**/dashboard', { timeout: 30000 })

    const storagePath = path.join(AUTH_DIR, filename)
    await context.storageState({ path: storagePath })
    console.log(`[setup] Saved storageState for ${email} to ${storagePath}`)
  })
}
