import * as fs from 'node:fs'
import * as path from 'node:path'
import type { FullConfig } from '@playwright/test'

const AUTH_DIR = path.join(__dirname, '..', '.auth')

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function globalTeardown(_config: FullConfig) {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true })
    console.log('[global-teardown] Cleaned up', AUTH_DIR)
  }
}
