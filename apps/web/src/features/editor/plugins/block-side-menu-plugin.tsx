'use client'

import { createPlatePlugin, useReadOnly } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { BlockGutter } from '../components/BlockGutter'

interface BlockWrapperProps {
  children: React.ReactNode
  element: TElement
}

function BlockWrapper({ children, element }: BlockWrapperProps) {
  const readOnly = useReadOnly()
  const isMobile = useIsMobile()

  if (readOnly || isMobile) {
    return <>{children}</>
  }

  return (
    <div className="group relative pl-8">
      <BlockGutter element={element} />
      {children}
    </div>
  )
}

export const BlockSideMenuPlugin = createPlatePlugin({
  key: 'blockSideMenu',
  render: {
    aboveNodes: ({ path }) => {
      // Only wrap top-level elements (direct children of editor)
      if (path.length !== 1) return undefined

      return BlockWrapper
    },
  },
})
