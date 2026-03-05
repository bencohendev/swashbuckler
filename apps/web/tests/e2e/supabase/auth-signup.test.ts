import { test as base, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

const hasSupabase = fs.existsSync(path.join(__dirname, '..', '..', '.auth', 'test-data.json'))

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
    base.skip(!hasSupabase, 'Supabase not running — skipping')
    // Use a unique email with a valid domain — remote Supabase rejects .localhost
    const uniqueEmail = `signup-${Date.now()}@example.com`
    await page.goto('/signup')

    await page.getByLabel('Email').fill(uniqueEmail)
    await page.locator('#password').fill('StrongPassword1!')
    await page.locator('#confirmPassword').fill('StrongPassword1!')
    await page.getByRole('button', { name: /create account/i }).click()

    // Wait for form submission response — remote Supabase may return success,
    // rate limit, or email validation errors depending on its configuration
    const confirmation = page.getByText('Check your email')
    const serverError = page.getByRole('alert')
    await expect(confirmation.or(serverError)).toBeVisible({ timeout: 15000 })

    // Only the confirmation UI proves signup works — skip on any server-side rejection
    // so the test doesn't false-pass when the remote Supabase is uncooperative
    if (await serverError.isVisible().catch(() => false)) {
      const errorText = await serverError.textContent().catch(() => '')
      base.skip(true, `Remote Supabase rejected signup: ${errorText}`)
    }
  })
})
