'use client'

import { useObjects } from '../hooks/useObjects'
import { ObjectList } from './ObjectList'

export function RecentObjects() {
  const { objects, isLoading } = useObjects({
    isDeleted: false,
    limit: 5,
  })

  return (
    <ObjectList
      objects={objects}
      isLoading={isLoading}
      emptyMessage="No recent objects. Create your first page to get started."
    />
  )
}
