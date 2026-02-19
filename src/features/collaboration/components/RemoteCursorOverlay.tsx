'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { relativeRangeToSlateRange } from '@slate-yjs/core'
import { useEditorRef } from '@udecode/plate/react'
import type { Awareness } from 'y-protocols/awareness'
// Import DOMEditor from the TOP-LEVEL slate-dom — NOT through @udecode/slate
// which has a nested copy with separate WeakMaps. See the component JSDoc.
import { DOMEditor } from 'slate-dom'
import * as Y from 'yjs'

interface CursorData {
  name: string
  color: string
}

interface CursorOverlayPosition {
  clientId: number
  data: CursorData
  caretPosition: { top: number; left: number; height: number } | null
  selectionRects: { left: number; top: number; width: number; height: number }[]
}

const SELECTION_FIELD = 'selection'
const DATA_FIELD = 'data'

interface RemoteCursorOverlayProps {
  awareness: Awareness
  doc: Y.Doc
}

function reconstructRelativeRange(raw: unknown): { anchor: Y.RelativePosition; focus: Y.RelativePosition } | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!r.anchor || !r.focus) return null
  try {
    return {
      anchor: Y.createRelativePositionFromJSON(r.anchor),
      focus: Y.createRelativePositionFromJSON(r.focus),
    }
  } catch {
    return null
  }
}

function getRangeRects(domRange: Range): DOMRect[] {
  const rects = Array.from(domRange.getClientRects())
  if (rects.length > 0) return rects

  const bounding = domRange.getBoundingClientRect()
  if (bounding.height > 0) return [bounding]

  return []
}

/**
 * Overlay that renders remote user cursors and selections.
 * Must be rendered inside a `<Plate>` context.
 *
 * IMPORTANT: Uses `DOMEditor` from `slate-dom` directly instead of
 * `editor.api.toDOMNode/toDOMRange` from `@udecode/slate`. There are two
 * copies of `slate-dom` in the dependency tree:
 *   - `slate-dom@0.123.0` (top-level, used by `slate-react` / `PlateContent`)
 *   - `slate-dom@0.114.0` (nested under `@udecode/slate`)
 * The WeakMaps that map Slate nodes → DOM elements are populated by
 * `slate-react` in the 0.123.0 copy. `editor.api.*` goes through
 * `@udecode/slate` → the 0.114.0 copy with empty WeakMaps → always fails.
 * Importing `DOMEditor` from `slate-dom` here resolves to the top-level
 * 0.123.0 copy, matching what `slate-react` uses.
 */
export function RemoteCursorOverlay({ awareness, doc }: RemoteCursorOverlayProps) {
  const editor = useEditorRef()
  const [cursors, setCursors] = useState<CursorOverlayPosition[]>([])
  const rafRef = useRef<number>(0)

  const updateCursors = useCallback(() => {
    const sharedRoot = doc.get('content', Y.XmlText)
    if (!sharedRoot || sharedRoot.length === 0) return

    let editorEl: HTMLElement
    try {
      // @ts-expect-error — Plate editor type doesn't match slate-dom 0.123.0's DOMEditor
      // type (different package versions), but the editor IS a DOMEditor at runtime.
      editorEl = DOMEditor.toDOMNode(editor, editor)
    } catch {
      return
    }

    const editorRect = editorEl.getBoundingClientRect()
    const localClientId = awareness.clientID
    const states = awareness.getStates()
    const positions: CursorOverlayPosition[] = []

    for (const [clientId, state] of states) {
      if (clientId === localClientId || !state) continue

      const rawSelection = state[SELECTION_FIELD]
      const data = state[DATA_FIELD] as CursorData | undefined
      if (!rawSelection || !data?.name) continue

      const relativeSelection = reconstructRelativeRange(rawSelection)
      if (!relativeSelection) continue

      try {
        const slateRange = relativeRangeToSlateRange(
          sharedRoot,
          editor,
          relativeSelection,
        )
        if (!slateRange) continue

        // @ts-expect-error — same cross-package type mismatch as above
        const domRange = DOMEditor.toDOMRange(editor, slateRange)

        const rects = getRangeRects(domRange)
        if (rects.length === 0) continue

        const selectionRects = rects.map(r => ({
          left: r.left - editorRect.left,
          top: r.top - editorRect.top,
          width: Math.max(r.width, 1),
          height: r.height,
        }))

        const lastRect = rects[rects.length - 1]
        const caretPosition = {
          left: lastRect.right - editorRect.left,
          top: lastRect.top - editorRect.top,
          height: lastRect.height,
        }

        positions.push({
          clientId,
          data,
          caretPosition,
          selectionRects,
        })
      } catch {
        continue
      }
    }

    setCursors(positions)
  }, [editor, awareness, doc])

  useEffect(() => {
    const scheduleUpdate = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateCursors)
    }

    awareness.on('change', scheduleUpdate)

    const interval = setInterval(updateCursors, 500)

    return () => {
      awareness.off('change', scheduleUpdate)
      cancelAnimationFrame(rafRef.current)
      clearInterval(interval)
    }
  }, [awareness, updateCursors])

  if (cursors.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {cursors.map(({ clientId, data, caretPosition, selectionRects }) => (
        <div key={clientId}>
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

          {caretPosition && (
            <div className="absolute" style={{ left: caretPosition.left, top: caretPosition.top }}>
              <div
                className="w-0.5"
                style={{
                  backgroundColor: data.color,
                  height: caretPosition.height,
                }}
              />
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
