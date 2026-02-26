'use client'

import { useState, useEffect, useRef, useCallback, type RefObject } from 'react'
import { useEditorRef } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'

export interface HoveredBlock {
  element: TElement
  path: number[]
  rect: { top: number; left: number; height: number }
}

/**
 * Track which top-level editor block the mouse is hovering over.
 *
 * Avoids `DOMEditor` entirely (the dual slate-dom package issue makes its
 * WeakMaps unreliable). Instead it finds the editor element via a container
 * ref and resolves Slate nodes by DOM child-index → `editor.children[i]`.
 */
export function useHoveredBlock(
  containerRef: RefObject<HTMLElement | null>,
): HoveredBlock | null {
  const editor = useEditorRef()
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null)
  const rafRef = useRef(0)
  const lastDomNodeRef = useRef<HTMLElement | null>(null)

  const update = useCallback(
    (target: EventTarget | null, editorEl: HTMLElement) => {
      if (!target || !(target instanceof HTMLElement)) {
        setHoveredBlock(null)
        lastDomNodeRef.current = null
        return
      }

      // Walk up from target to find the closest Slate element node
      const slateEl = target.closest(
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
        const parent = topLevel.parentElement.closest(
          '[data-slate-node="element"]',
        ) as HTMLElement | null
        if (!parent || parent === editorEl) break
        topLevel = parent
      }

      // Skip if same DOM node as last time
      if (topLevel === lastDomNodeRef.current) return
      lastDomNodeRef.current = topLevel

      // Resolve Slate node by DOM child index
      const index = Array.from(editorEl.children).indexOf(topLevel)
      if (index === -1) {
        setHoveredBlock(null)
        lastDomNodeRef.current = null
        return
      }

      const slateNode = editor.children[index] as TElement | undefined
      if (!slateNode) {
        setHoveredBlock(null)
        lastDomNodeRef.current = null
        return
      }

      const blockRect = topLevel.getBoundingClientRect()

      setHoveredBlock({
        element: slateNode,
        path: [index],
        rect: {
          top: blockRect.top,
          left: blockRect.left,
          height: blockRect.height,
        },
      })
    },
    [editor],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Find the editor element — a sibling of our anchor inside the Plate wrapper
    const editorEl = container.parentElement?.querySelector(
      '[data-slate-editor="true"]',
    ) as HTMLElement | null
    if (!editorEl) return

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => update(e.target, editorEl))
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
  }, [containerRef, update])

  return hoveredBlock
}
