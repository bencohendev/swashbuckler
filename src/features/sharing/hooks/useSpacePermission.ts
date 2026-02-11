import { useMemo } from 'react'
import { useAuth, useCurrentSpace } from '@/shared/lib/data'
import { resolveSpacePermission, canEdit, isOwner } from '../lib/permissions'

export function useSpacePermission() {
  const { space, sharedPermission } = useCurrentSpace()
  const { user } = useAuth()

  return useMemo(() => {
    const permission = resolveSpacePermission(space, user?.id, sharedPermission)
    return {
      permission,
      canEdit: canEdit(permission),
      isOwner: isOwner(permission),
    }
  }, [space, user?.id, sharedPermission])
}
