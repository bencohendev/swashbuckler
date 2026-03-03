import * as fs from 'node:fs'
import * as path from 'node:path'
import type { FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { USER_A_EMAIL, USER_B_EMAIL } from './global-setup'

const AUTH_DIR = path.join(__dirname, '..', '.auth')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function globalTeardown(_config: FullConfig) {
  // Delete test users (cascades to all their spaces/objects/shares via FK)
  if (SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: existing } = await admin.auth.admin.listUsers()
      const testEmails = [USER_A_EMAIL, USER_B_EMAIL]

      for (const user of existing?.users ?? []) {
        if (testEmails.includes(user.email ?? '')) {
          await admin.auth.admin.deleteUser(user.id)
          console.log(`[global-teardown] Deleted test user ${user.email}`)
        }
      }
    } catch (err) {
      console.warn('[global-teardown] Failed to clean up test users:', err)
    }
  }

  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true })
    console.log('[global-teardown] Cleaned up', AUTH_DIR)
  }
}
