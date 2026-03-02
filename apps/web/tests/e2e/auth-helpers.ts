/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixtures use `use()` which trips this rule */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { TestData } from './global-setup'

const AUTH_DIR = path.join(__dirname, '..', '.auth')
const TEST_DATA_PATH = path.join(AUTH_DIR, 'test-data.json')

function loadTestData(): TestData | null {
  if (!fs.existsSync(TEST_DATA_PATH)) return null
  return JSON.parse(fs.readFileSync(TEST_DATA_PATH, 'utf-8'))
}

// ---------------------------------------------------------------------------
// Single authenticated user fixture (User A)
// ---------------------------------------------------------------------------

interface AuthFixtures {
  authPage: Page
  testData: TestData
}

export const test = base.extend<AuthFixtures>({
  testData: async ({}, use, testInfo) => {
    const data = loadTestData()
    if (!data) {
      testInfo.skip(true, 'Supabase not running — skipping')
      return
    }
    await use(data)
  },

  authPage: async ({ browser, testData: _testData }, use) => {
    const storagePath = path.join(AUTH_DIR, 'userA.json')
    const context = await browser.newContext({ storageState: storagePath })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

// ---------------------------------------------------------------------------
// Two-user fixture (User A + User B with separate browser contexts)
// ---------------------------------------------------------------------------

interface TwoUserFixtures {
  testData: TestData
  userAContext: BrowserContext
  userBContext: BrowserContext
  userAPage: Page
  userBPage: Page
}

export const twoUserTest = base.extend<TwoUserFixtures>({
  testData: async ({}, use, testInfo) => {
    const data = loadTestData()
    if (!data) {
      testInfo.skip(true, 'Supabase not running — skipping')
      return
    }
    await use(data)
  },

  userAContext: async ({ browser }, use) => {
    const storagePath = path.join(AUTH_DIR, 'userA.json')
    const context = await browser.newContext({ storageState: storagePath })
    await use(context)
    await context.close()
  },

  userBContext: async ({ browser }, use) => {
    const storagePath = path.join(AUTH_DIR, 'userB.json')
    const context = await browser.newContext({ storageState: storagePath })
    await use(context)
    await context.close()
  },

  userAPage: async ({ userAContext }, use) => {
    const page = await userAContext.newPage()
    await use(page)
  },

  userBPage: async ({ userBContext }, use) => {
    const page = await userBContext.newPage()
    await use(page)
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Switch to a shared space in the sidebar space switcher. */
export async function switchToSpace(page: Page, spaceName: string) {
  // Click the space switcher trigger
  const switcher = page.locator('[data-tour="space-switcher"]')
  await switcher.click()

  // Click the target space
  const item = page.getByRole('menuitem').filter({ hasText: spaceName })
  await item.click()

  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

/** Open the share dialog from the space switcher. */
export async function openShareDialog(page: Page) {
  const switcher = page.locator('[data-tour="space-switcher"]')
  await switcher.click()

  const shareItem = page.getByRole('menuitem', { name: 'Share Space' })
  await shareItem.click()

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
}

/** Navigate to an object by its title from the sidebar. */
export async function openObjectByTitle(page: Page, title: string) {
  const sidebarLink = page.locator('aside, nav').getByText(title, { exact: true }).first()
  await sidebarLink.click()
  await page.waitForURL(/\/objects\//, { timeout: 10000 })
}

/** Wait for the collaboration connection to be established. */
export async function waitForCollabReady(page: Page) {
  // Collaboration is active when the editor is loaded and connected.
  // The CollaboratorAvatars container is rendered once awareness is set up.
  // We wait for the editor contenteditable to be present as a proxy.
  await expect(page.locator('[contenteditable="true"]')).toBeVisible({ timeout: 15000 })
  // Small delay for the Yjs provider to connect via Supabase Broadcast
  await page.waitForTimeout(2000)
}

export { expect }
