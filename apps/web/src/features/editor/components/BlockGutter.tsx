'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditorRef } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'
import { GripVertical, Plus, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/components/ui/DropdownMenu'

function stripIds(node: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...node }
  delete clone.id
  if (Array.isArray(clone.children)) {
    clone.children = (clone.children as Record<string, unknown>[]).map(stripIds)
  }
  return clone
}

type HandleRef = (
  elementOrNode:
    | Element
    | React.ReactElement
    | React.RefObject<unknown>
    | null,
) => void

interface BlockGutterProps {
  element: TElement
  handleRef?: HandleRef
}

export function BlockGutter({ element, handleRef }: BlockGutterProps) {
  const editor = useEditorRef()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const gripRef = useRef<HTMLButtonElement>(null)

  // Connect the drag handle ref to the grip button
  useEffect(() => {
    if (!handleRef || !gripRef.current) return
    handleRef(gripRef.current)
    return () => {
      handleRef(null)
    }
  }, [handleRef])

  // Close menu when drag starts from the grip button
  useEffect(() => {
    const el = gripRef.current
    if (!el) return

    const onDragStart = () => setIsMenuOpen(false)
    el.addEventListener('dragstart', onDragStart)
    return () => el.removeEventListener('dragstart', onDragStart)
  }, [])

  const getPath = useCallback(() => {
    const index = editor.children.indexOf(element)
    if (index === -1) return null
    return [index]
  }, [editor, element])

  const insertAbove = useCallback(() => {
    const path = getPath()
    if (!path) return
    editor.tf.insertNodes(
      { type: 'p', children: [{ text: '' }] },
      { at: path },
    )
    editor.tf.select(editor.api.start(path))
  }, [editor, getPath])

  const insertBelow = useCallback(() => {
    const path = getPath()
    if (!path) return
    const nextPath = [path[0] + 1]
    editor.tf.insertNodes(
      { type: 'p', children: [{ text: '' }] },
      { at: nextPath },
    )
    editor.tf.select(editor.api.start(nextPath))
  }, [editor, getPath])

  const duplicate = useCallback(() => {
    const path = getPath()
    if (!path) return
    const cloned = stripIds(
      JSON.parse(JSON.stringify(element)) as Record<string, unknown>,
    )
    const nextPath = [path[0] + 1]
    editor.tf.insertNodes(cloned as TElement, { at: nextPath })
  }, [editor, element, getPath])

  const deleteBlock = useCallback(() => {
    const path = getPath()
    if (!path) return
    editor.tf.removeNodes({ at: path })
  }, [editor, getPath])

  const moveUp = useCallback(() => {
    const path = getPath()
    if (!path || path[0] <= 0) return
    editor.tf.moveNodes({ at: path, to: [path[0] - 1] })
  }, [editor, getPath])

  const moveDown = useCallback(() => {
    const path = getPath()
    if (!path || path[0] >= editor.children.length - 1) return
    // Slate adjusts newPath by -1 when source is before destination,
    // so we use path[0] + 2 to end up at path[0] + 1.
    editor.tf.moveNodes({ at: path, to: [path[0] + 2] })
  }, [editor, getPath])

  const idx = editor.children.indexOf(element)
  const isFirst = idx <= 0
  const isLast = idx >= editor.children.length - 1

  return (
    <div
      contentEditable={false}
      className={`absolute left-0 top-1 flex h-6 items-center transition-opacity duration-150 ${
        isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      <DropdownMenu onOpenChange={setIsMenuOpen} open={isMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            ref={gripRef}
            type="button"
            className="flex size-6 cursor-grab items-center justify-center rounded hover:bg-accent"
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
          <DropdownMenuItem onSelect={moveUp} disabled={isFirst}>
            <ArrowUp className="mr-2 size-4" />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={moveDown} disabled={isLast}>
            <ArrowDown className="mr-2 size-4" />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={deleteBlock}>
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
