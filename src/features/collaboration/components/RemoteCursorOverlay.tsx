'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { CursorEditor, type CursorState } from '@slate-yjs/core'
import { useEditorRef } from '@udecode/plate/react'

interface CursorData extends Record<string, unknown> {
  name: string
  color: string
}

interface CursorOverlayPosition {
  clientId: string
  data: CursorData
  caretPosition: { top: number; left: number; height: number } | null
  selectionRects: { left: number; top: number; width: number; height: number }[]
}

/**
 * Overlay that renders remote user cursors and selections.
 * Must be rendered inside a `<Plate>` context.
 */
export function RemoteCursorOverlay() {
  const editor = useEditorRef()
  const containerRef = useRef<HTMLDivElement>(null)
  const [cursors, setCursors] = useState<CursorOverlayPosition[]>([])

  const updateCursors = useCallback(() => {
    if (!CursorEditor.isCursorEditor(editor)) return

    const cursorStates = CursorEditor.cursorStates<CursorData>(editor)
    const editorEl = editor.api.toDOMNode(editor)
    if (!editorEl) return

    const editorRect = editorEl.getBoundingClientRect()
    const positions: CursorOverlayPosition[] = []

    for (const [clientId, state] of Object.entries(cursorStates)) {
      if (!state.relativeSelection || !state.data) continue

      try {
        const domRange = editor.api.toDOMRange(state.relativeSelection)
        if (!domRange) continue

        const rects = Array.from(domRange.getClientRects())
        if (rects.length === 0) continue

        const selectionRects = rects.map(r => ({
          left: r.left - editorRect.left,
          top: r.top - editorRect.top,
          width: Math.max(r.width, 1),
          height: r.height,
        }))

        // Caret at focus point (last rect)
        const lastRect = rects[rects.length - 1]
        const caretPosition = {
          left: lastRect.right - editorRect.left,
          top: lastRect.top - editorRect.top,
          height: lastRect.height,
        }

        positions.push({
          clientId,
          data: state.data,
          caretPosition,
          selectionRects,
        })
      } catch {
        // Range might be invalid if content changed between peers
        continue
      }
    }

    setCursors(positions)
  }, [editor])

  useEffect(() => {
    if (!CursorEditor.isCursorEditor(editor)) return

    // Update cursors when remote cursors change
    CursorEditor.on(editor, 'change', updateCursors)

    // Also update periodically to reposition after scroll/resize
    const interval = setInterval(updateCursors, 500)

    return () => {
      CursorEditor.off(editor, 'change', updateCursors)
      clearInterval(interval)
    }
  }, [editor, updateCursors])

  if (cursors.length === 0) return null

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {cursors.map(({ clientId, data, caretPosition, selectionRects }) => (
        <div key={clientId}>
          {/* Selection highlights */}
          {selectionRects.map((rect, i) => (
            <div
              key={`sel-${i}`}
              className="absolute opacity-20"
              style={{
                backgroundColor: data.color,
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }}
            />
          ))}

          {/* Caret line */}
          {caretPosition && (
            <div className="absolute" style={{ left: caretPosition.left, top: caretPosition.top }}>
              <div
                className="w-0.5"
                style={{
                  backgroundColor: data.color,
                  height: caretPosition.height,
                }}
              />
              {/* User name label */}
              <div
                className="absolute -top-5 left-0 whitespace-nowrap rounded px-1 py-0.5 text-[10px] leading-tight text-white"
                style={{ backgroundColor: data.color }}
              >
                {data.name}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
