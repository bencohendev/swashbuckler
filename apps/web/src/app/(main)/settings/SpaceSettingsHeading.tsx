'use client'

import { useCurrentSpace } from '@/shared/lib/data'

export function SpaceSettingsHeading() {
  const { space } = useCurrentSpace()
  const heading = space ? `${space.icon ?? ''} ${space.name}`.trim() : 'Space'

  return <h2 id="settings-space-heading" className="mb-4 text-lg font-medium">{heading}</h2>
}
