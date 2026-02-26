'use client'

import { useState, useCallback } from 'react'
import { useEditorRef } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'
import { GripVertical, Plus, Copy, Trash2 } from 'lucide-react'
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

interface BlockGutterProps {
  element: TElement
}

export function BlockGutter({ element }: BlockGutterProps) {
  const editor = useEditorRef()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
    </div>
  )
}
