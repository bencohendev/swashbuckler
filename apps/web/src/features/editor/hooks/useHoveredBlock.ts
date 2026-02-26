'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditorRef, useReadOnly } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'
// Import DOMEditor from the TOP-LEVEL slate-dom — NOT through @udecode/slate
// which has a nested copy with separate WeakMaps.
import { DOMEditor } from 'slate-dom'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

interface HoveredBlock {
  element: TElement
  path: number[]
  rect: { top: number; left: number; height: number }
}

export function useHoveredBlock(): HoveredBlock | null {
  const editor = useEditorRef()
  const readOnly = useReadOnly()
  const isMobile = useIsMobile()
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null)
  const rafRef = useRef(0)
  const lastDomNodeRef = useRef<HTMLElement | null>(null)

  const update = useCallback(
    (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) {
        setHoveredBlock(null)
        lastDomNodeRef.current = null
        return
      }

      let editorEl: HTMLElement
      try {
        // @ts-expect-error — Plate editor type doesn't match slate-dom 0.123.0's DOMEditor
        editorEl = DOMEditor.toDOMNode(editor, editor)
      } catch {
        return
      }

      // Walk up from target to find the closest Slate element node
      const slateEl = (target as HTMLElement).closest?.(
        '[data-slate-node="element"]',
      ) as HTMLElement | null
      if (!slateEl) {
        setHoveredBlock(null)
        lastDomNodeRef.current = null
        return
      }

      // Walk up to find the top-level block (direct child of editor element)
      let topLevel = slateEl
      while (topLevel.parentElement && topLevel.parentElement !== editorEl) {
        const parent = topLevel.parentElement.closest?.(
          '[data-slate-node="element"]',
        ) as HTMLElement | null
        if (!parent || parent === editorEl) break
        topLevel = parent
      }

      // Skip if same DOM node as last time
      if (topLevel === lastDomNodeRef.current) return
      lastDomNodeRef.current = topLevel

      try {
        // @ts-expect-error — same cross-package type mismatch
        const slateNode = DOMEditor.toSlateNode(editor, topLevel) as TElement
        // @ts-expect-error — same cross-package type mismatch
        const path = DOMEditor.findPath(editor, topLevel)

        const blockRect = topLevel.getBoundingClientRect()

        setHoveredBlock({
          element: slateNode,
          path,
          rect: {
            top: blockRect.top,
            left: blockRect.left,
            height: blockRect.height,
          },
        })
      } catch {
        setHoveredBlock(null)
        lastDomNodeRef.current = null
      }
    },
    [editor],
  )

  useEffect(() => {
    if (readOnly || isMobile) return

    let editorEl: HTMLElement
    try {
      // @ts-expect-error — same cross-package type mismatch
      editorEl = DOMEditor.toDOMNode(editor, editor)
    } catch {
      return
    }

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => update(e.target))
    }

    const onMouseLeave = () => {
      cancelAnimationFrame(rafRef.current)
      setHoveredBlock(null)
      lastDomNodeRef.current = null
    }

    editorEl.addEventListener('mousemove', onMouseMove)
    editorEl.addEventListener('mouseleave', onMouseLeave)

    return () => {
      editorEl.removeEventListener('mousemove', onMouseMove)
      editorEl.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [editor, readOnly, isMobile, update])

  if (readOnly || isMobile) return null

  return hoveredBlock
}
