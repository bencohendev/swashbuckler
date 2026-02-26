'use client'

import { createPlatePlugin, useReadOnly } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'
import { useDraggable, useDropLine } from '@udecode/plate-dnd'
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
    <DraggableBlockWrapper element={element}>
      {children}
    </DraggableBlockWrapper>
  )
}

function DraggableBlockWrapper({ children, element }: BlockWrapperProps) {
  const { previewRef, handleRef, isDragging } = useDraggable({ element })

  return (
    <div
      ref={previewRef}
      className={`group relative pl-8${isDragging ? ' opacity-50' : ''}`}
    >
      <BlockGutter element={element} handleRef={handleRef} />
      {children}
      <DropLineIndicator id={element.id as string} />
    </div>
  )
}

function DropLineIndicator({ id }: { id: string }) {
  const { dropLine } = useDropLine({ id })

  if (!dropLine || (dropLine !== 'top' && dropLine !== 'bottom')) return null

  return (
    <div
      className="absolute left-0 right-0 h-0.5 bg-primary"
      style={dropLine === 'top' ? { top: -1 } : { bottom: -1 }}
    />
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
