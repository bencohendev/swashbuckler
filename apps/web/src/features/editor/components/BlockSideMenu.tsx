'use client'

import { useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useEditorRef, useReadOnly } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'
import { GripVertical, Plus, Copy, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/components/ui/DropdownMenu'
import { useHoveredBlock, type HoveredBlock } from '../hooks/useHoveredBlock'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

function stripIds(node: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...node }
  delete clone.id
  if (Array.isArray(clone.children)) {
    clone.children = (clone.children as Record<string, unknown>[]).map(stripIds)
  }
  return clone
}

export function BlockSideMenu() {
  const editor = useEditorRef()
  const readOnly = useReadOnly()
  const isMobile = useIsMobile()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const hoveredBlock = useHoveredBlock(anchorRef)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [lockedBlock, setLockedBlock] = useState<HoveredBlock | null>(null)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && hoveredBlock) {
        setLockedBlock({
          rect: hoveredBlock.rect,
          path: hoveredBlock.path,
          element: hoveredBlock.element,
        })
      }
      if (!open) {
        setLockedBlock(null)
      }
      setIsMenuOpen(open)
    },
    [hoveredBlock],
  )

  // Always render the anchor span so the hook can find the editor element.
  // Portal the visible menu to document.body to escape overflow containers.
  const anchor = <span ref={anchorRef} className="hidden" />

  if (readOnly || isMobile) return anchor

  const active = isMenuOpen ? lockedBlock : hoveredBlock
  if (!active) return anchor

  const { rect, path, element } = active

  const insertAbove = () => {
    editor.tf.insertNodes(
      { type: 'p', children: [{ text: '' }] },
      { at: path },
    )
    editor.tf.select(editor.api.start(path))
  }

  const insertBelow = () => {
    const nextPath = [...path.slice(0, -1), path[path.length - 1] + 1]
    editor.tf.insertNodes(
      { type: 'p', children: [{ text: '' }] },
      { at: nextPath },
    )
    editor.tf.select(editor.api.start(nextPath))
  }

  const duplicate = () => {
    const cloned = stripIds(
      JSON.parse(JSON.stringify(element)) as Record<string, unknown>,
    )
    const nextPath = [...path.slice(0, -1), path[path.length - 1] + 1]
    editor.tf.insertNodes(cloned as TElement, { at: nextPath })
  }

  const deleteBlock = () => {
    editor.tf.removeNodes({ at: path })
  }

  return (
    <>
      {anchor}
      {createPortal(
        <div
          className="pointer-events-auto fixed z-50 transition-opacity duration-150"
          style={{
            top: rect.top + rect.height / 2 - 12,
            left: rect.left - 36,
          }}
        >
          <DropdownMenu onOpenChange={handleOpenChange} open={isMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded hover:bg-accent"
                aria-label="Block options"
              >
                <GripVertical className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="left">
              <DropdownMenuItem onSelect={insertAbove}>
                <Plus className="mr-2 size-4" />
                Insert above
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={insertBelow}>
                <Plus className="mr-2 size-4" />
                Insert below
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={duplicate}>
                <Copy className="mr-2 size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={deleteBlock}>
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>,
        document.body,
      )}
    </>
  )
}
