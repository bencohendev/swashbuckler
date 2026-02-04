import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page has sign in form', async ({ page }) => {
    await page.goto('/login')

    // Check for login form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('signup page has registration form', async ({ page }) => {
    await page.goto('/signup')

    // Check for signup form elements
    await expect(page.getByRole('heading', { name: /sign up/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
  })
})
