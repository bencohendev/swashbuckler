import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('redirects unauthenticated users to landing page', async ({ page }) => {
    await page.goto('/')

    // Should redirect to landing page for first-time visitors
    await expect(page).toHaveURL(/\/landing/)
  })

  test('landing page has guest mode and sign-up options', async ({ page }) => {
    await page.goto('/landing')

    // Check for key landing page elements
    await expect(page.getByRole('heading', { name: 'Swashbuckler' })).toBeVisible()
    await expect(page.getByRole('button', { name: /try as guest/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('login page has sign in form', async ({ page }) => {
    await page.goto('/login')

    // CardTitle renders as a div, so check by text content
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('signup page has registration form', async ({ page }) => {
    await page.goto('/signup')

    await expect(page.getByText('Create an account')).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })
})
