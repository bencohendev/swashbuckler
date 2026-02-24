import { describe, it, expect } from 'vitest'
import {
  resolveSpacePermission,
  canEdit,
  isOwner,
} from '@/features/sharing/lib/permissions'
import type { Space } from '@/shared/lib/data'

const mockSpace = (ownerId: string): Space => ({
  id: crypto.randomUUID(),
  name: 'Test Space',
  icon: '📁',
  owner_id: ownerId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

describe('resolveSpacePermission', () => {
  it('returns view when space is null', () => {
    expect(resolveSpacePermission(null, 'some-user-id', null)).toBe('view')
  })

  it('returns view when userId is undefined and space is not local', () => {
    const space = mockSpace('owner-123')
    expect(resolveSpacePermission(space, undefined, null)).toBe('view')
  })

  it('returns owner when userId is undefined and space owner is local (guest mode)', () => {
    const space = mockSpace('local')
    expect(resolveSpacePermission(space, undefined, null)).toBe('owner')
  })

  it('returns view when both space is null and userId is undefined', () => {
    expect(resolveSpacePermission(null, undefined, null)).toBe('view')
  })

  it('returns owner when userId matches space owner_id', () => {
    const ownerId = crypto.randomUUID()
    const space = mockSpace(ownerId)
    expect(resolveSpacePermission(space, ownerId, null)).toBe('owner')
  })

  it('returns owner even when sharedPermission is edit (owner always wins)', () => {
    const ownerId = crypto.randomUUID()
    const space = mockSpace(ownerId)
    expect(resolveSpacePermission(space, ownerId, 'edit')).toBe('owner')
  })

  it('returns edit for non-owner with sharedPermission edit', () => {
    const space = mockSpace(crypto.randomUUID())
    const otherUserId = crypto.randomUUID()
    expect(resolveSpacePermission(space, otherUserId, 'edit')).toBe('edit')
  })

  it('returns view for non-owner with sharedPermission null', () => {
    const space = mockSpace(crypto.randomUUID())
    const otherUserId = crypto.randomUUID()
    expect(resolveSpacePermission(space, otherUserId, null)).toBe('view')
  })

  it('returns view for non-owner with sharedPermission view', () => {
    const space = mockSpace(crypto.randomUUID())
    const otherUserId = crypto.randomUUID()
    expect(resolveSpacePermission(space, otherUserId, 'view')).toBe('view')
  })
})

describe('canEdit', () => {
  it('returns true for owner permission', () => {
    expect(canEdit('owner')).toBe(true)
  })

  it('returns true for edit permission', () => {
    expect(canEdit('edit')).toBe(true)
  })

  it('returns false for view permission', () => {
    expect(canEdit('view')).toBe(false)
  })
})

describe('isOwner', () => {
  it('returns true for owner permission', () => {
    expect(isOwner('owner')).toBe(true)
  })

  it('returns false for edit permission', () => {
    expect(isOwner('edit')).toBe(false)
  })

  it('returns false for view permission', () => {
    expect(isOwner('view')).toBe(false)
  })
})
