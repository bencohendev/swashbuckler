import type { Space, SpaceSharePermission, SpacePermission } from '@/shared/lib/data'

export function resolveSpacePermission(
  space: Space | null,
  userId: string | undefined,
  sharedPermission: SpaceSharePermission | null,
): SpacePermission {
  if (!space || !userId) return 'view'
  if (space.owner_id === userId) return 'owner'
  if (sharedPermission === 'edit') return 'edit'
  return 'view'
}

export function canEdit(permission: SpacePermission): boolean {
  return permission === 'owner' || permission === 'edit'
}

export function isOwner(permission: SpacePermission): boolean {
  return permission === 'owner'
}
