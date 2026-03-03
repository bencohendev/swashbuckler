import type { FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const AUTH_DIR = path.join(__dirname, '..', '.auth')
const TEST_DATA_PATH = path.join(AUTH_DIR, 'test-data.json')

export const USER_A_EMAIL = 'user-a@test.localhost'
export const USER_A_PASSWORD = 'TestPassword1!'
export const USER_B_EMAIL = 'user-b@test.localhost'
export const USER_B_PASSWORD = 'TestPassword2!'

export interface TestData {
  userA: { id: string; email: string }
  userB: { id: string; email: string }
  spaceA: { id: string; name: string }
  archiveSpace: { id: string; name: string }
  typeA: { id: string; slug: string }
  shareId: string
  sharedPageId: string
  collabPageId: string
}

async function isSupabaseReachable(): Promise<boolean> {
  try {
    // Use auth health endpoint — the REST endpoint returns 401 with newer publishable key formats
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
    return res.ok
  } catch {
    return false
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function globalSetup(_config: FullConfig) {
  if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    console.log('[global-setup] Missing Supabase keys — skipping Supabase test setup')
    return
  }

  if (!(await isSupabaseReachable())) {
    console.log('[global-setup] Local Supabase not reachable — skipping setup')
    return
  }

  console.log('[global-setup] Local Supabase detected — setting up test data')

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // -----------------------------------------------------------------------
  // 1. Create test users (idempotent — delete existing first)
  // -----------------------------------------------------------------------
  for (const email of [USER_A_EMAIL, USER_B_EMAIL]) {
    const { data: existing } = await admin.auth.admin.listUsers()
    const user = existing?.users?.find((u) => u.email === email)
    if (user) {
      await admin.auth.admin.deleteUser(user.id)
    }
  }

  const { data: userAData, error: userAError } = await admin.auth.admin.createUser({
    email: USER_A_EMAIL,
    password: USER_A_PASSWORD,
    email_confirm: true,
  })
  if (userAError) throw new Error(`Failed to create User A: ${userAError.message}`)
  const userAId = userAData.user.id

  const { data: userBData, error: userBError } = await admin.auth.admin.createUser({
    email: USER_B_EMAIL,
    password: USER_B_PASSWORD,
    email_confirm: true,
  })
  if (userBError) throw new Error(`Failed to create User B: ${userBError.message}`)
  const userBId = userBData.user.id

  // -----------------------------------------------------------------------
  // 2. Query User A's auto-created space and type
  // -----------------------------------------------------------------------
  // The handle_new_user_space trigger creates "My Space" + "Page" type
  // Rename User A's space to something distinctive (both users auto-get "My Space")
  const { error: renameError } = await admin
    .from('spaces')
    .update({ name: 'User A Space' })
    .eq('owner_id', userAId)
  if (renameError) throw new Error(`Failed to rename User A's space: ${renameError.message}`)

  const { data: spaceRows, error: spaceError } = await admin
    .from('spaces')
    .select('id, name')
    .eq('owner_id', userAId)
    .limit(1)
    .single()
  if (spaceError) throw new Error(`Failed to query User A's space: ${spaceError.message}`)

  // Create a second space for archive tests
  const { data: archiveSpaceData, error: archiveSpaceError } = await admin
    .from('spaces')
    .insert({
      name: 'Archive Test Space',
      icon: '📁',
      owner_id: userAId,
    })
    .select('id, name')
    .single()
  if (archiveSpaceError) throw new Error(`Failed to create archive space: ${archiveSpaceError.message}`)

  const { data: typeRows, error: typeError } = await admin
    .from('object_types')
    .select('id, slug')
    .eq('space_id', spaceRows.id)
    .eq('slug', 'page')
    .limit(1)
    .single()
  if (typeError) throw new Error(`Failed to query User A's Page type: ${typeError.message}`)

  // -----------------------------------------------------------------------
  // 3. Create a space share (User A → User B, edit permission)
  // -----------------------------------------------------------------------
  const { data: shareData, error: shareError } = await admin
    .from('space_shares')
    .insert({
      space_id: spaceRows.id,
      owner_id: userAId,
      shared_with_id: userBId,
      shared_with_email: USER_B_EMAIL,
      permission: 'edit',
    })
    .select('id')
    .single()
  if (shareError) throw new Error(`Failed to create share: ${shareError.message}`)

  // -----------------------------------------------------------------------
  // 4. Create test objects in User A's space
  // -----------------------------------------------------------------------
  const { data: sharedPage, error: sharedPageError } = await admin
    .from('objects')
    .insert({
      title: 'Shared Test Page',
      type_id: typeRows.id,
      owner_id: userAId,
      space_id: spaceRows.id,
      content: [{ type: 'p', children: [{ text: 'Shared page content' }] }],
    })
    .select('id')
    .single()
  if (sharedPageError) throw new Error(`Failed to create shared page: ${sharedPageError.message}`)

  const { data: collabPage, error: collabPageError } = await admin
    .from('objects')
    .insert({
      title: 'Collab Test Page',
      type_id: typeRows.id,
      owner_id: userAId,
      space_id: spaceRows.id,
      content: [{ type: 'p', children: [{ text: 'Collaboration test content' }] }],
    })
    .select('id')
    .single()
  if (collabPageError) throw new Error(`Failed to create collab page: ${collabPageError.message}`)

  // -----------------------------------------------------------------------
  // 5. Save test data
  // -----------------------------------------------------------------------
  const testData: TestData = {
    userA: { id: userAId, email: USER_A_EMAIL },
    userB: { id: userBId, email: USER_B_EMAIL },
    spaceA: { id: spaceRows.id, name: spaceRows.name },
    archiveSpace: { id: archiveSpaceData.id, name: archiveSpaceData.name },
    typeA: { id: typeRows.id, slug: typeRows.slug },
    shareId: shareData.id,
    sharedPageId: sharedPage.id,
    collabPageId: collabPage.id,
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true })
  fs.writeFileSync(TEST_DATA_PATH, JSON.stringify(testData, null, 2))
  console.log('[global-setup] Test data saved to', TEST_DATA_PATH)
  console.log('[global-setup] API setup complete — browser login handled by setup project')
}
