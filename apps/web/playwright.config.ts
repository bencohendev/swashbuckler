import * as fs from 'node:fs'
import * as path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

// Load .env.local so global-setup and webServer both see Supabase keys.
const envLocalPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envLocalPath)) {
  process.loadEnvFile(envLocalPath)
}

// Use a dedicated port for Playwright tests to avoid conflicts with the user's dev server.
const PW_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3002)
const BASE_URL = `http://localhost:${PW_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : 'html',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/supabase\//, /\.setup\.ts$/],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [/supabase\//, /\.setup\.ts$/],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: [/supabase\//, /\.setup\.ts$/],
    },
    // Setup project: logs in via browser and saves storageState (runs after webServer starts)
    {
      name: 'supabase-setup',
      testMatch: /supabase-login\.setup\.ts$/,
    },
    {
      name: 'supabase',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /supabase\/.+\.test\.ts$/,
      testIgnore: /auth-logout\.test\.ts$/,
      dependencies: ['supabase-setup'],
      fullyParallel: false,
      timeout: 60_000,
    },
    // Logout tests run LAST — signOut({ scope: 'global' }) revokes ALL sessions for the user,
    // which would invalidate storageState tokens used by other tests.
    {
      name: 'supabase-logout',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /supabase\/auth-logout\.test\.ts$/,
      dependencies: ['supabase'],
      timeout: 60_000,
    },
  ],
  webServer: {
    command: `npx next build && npx next start --port ${PW_PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    },
  },
})
