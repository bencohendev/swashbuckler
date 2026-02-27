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

/**
 * Hook-free wrapper returned by aboveNodes.
 *
 * Plate's `aboveNodes` mechanism calls the returned component as a plain
 * function (not JSX), which means any hooks inside it execute in the calling
 * `ElementContent`'s React context. Because `aboveNodes` conditionally returns
 * this wrapper (only for top-level elements), the hook count inside
 * `ElementContent` would differ between top-level and nested elements — a
 * React hooks-rules violation that causes "Rendered fewer hooks than expected."
 *
 * To avoid this, this wrapper contains NO hooks. It just renders
 * `<BlockWrapperInner>` as JSX, giving it its own component instance and
 * isolated hook context.
 */
function BlockWrapperShell({ children, element }: BlockWrapperProps) {
  return (
    <BlockWrapperInner element={element}>
      {children}
    </BlockWrapperInner>
  )
}

function BlockWrapperInner({ children, element }: BlockWrapperProps) {
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
      className={`group relative${isDragging ? ' opacity-50' : ''}`}
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
      if (!path || path.length !== 1) return undefined

      return BlockWrapperShell
    },
  },
})
