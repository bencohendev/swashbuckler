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
  const MAX_RETRIES = 5
  const switcher = page.locator('[data-tour="space-switcher"]')
  await switcher.waitFor({ state: 'visible', timeout: 15000 })

  const menu = page.locator('[role="menu"]')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Wait for any existing menu to fully close before clicking
    await menu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

    await switcher.click()

    try {
      await menu.waitFor({ state: 'visible', timeout: 3000 })
      break // Menu opened successfully
    } catch {
      // Menu didn't open — press Escape to force close any stuck state, then retry
      await page.keyboard.press('Escape')
      if (attempt === MAX_RETRIES - 1) {
        throw new Error(`Failed to open space switcher after ${MAX_RETRIES} attempts`)
      }
    }
  }

  // Wait for the target space to appear and click it
  const item = page.getByRole('menuitem').filter({ hasText: spaceName })
  await item.waitFor({ state: 'visible', timeout: 15000 })
  await item.click()

  // Wait for the switcher to show the selected space
  await expect(switcher).toContainText(spaceName, { timeout: 10000 })
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
  // Wait for the editor to be visible
  await expect(page.locator('[contenteditable="true"]')).toBeVisible({ timeout: 15000 })
  // Wait for the "Synced" status indicator — confirms Yjs provider is connected via Supabase Broadcast
  await expect(page.getByText('Synced')).toBeVisible({ timeout: 15000 })
  // Additional delay for the broadcast channel to fully establish bidirectional communication
  await page.waitForTimeout(3000)
}

export { expect }
