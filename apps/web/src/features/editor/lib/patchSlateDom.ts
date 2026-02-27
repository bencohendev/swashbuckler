/**
 * Patches `DOMEditor.toDOMNode` from the top-level `slate-dom` package to
 * not throw when the editor element can't be found in the WeakMap.
 *
 * WHY: `slate-react`'s `onDOMSelectionChange` is throttled (~100ms) and calls
 * `ReactEditor.toDOMNode(editor, editor)` without try-catch. During React
 * Strict Mode double-renders, timing gaps between unmount/remount, or when
 * multiple Slate editors coexist (e.g., page editor + modal editor), the
 * `EDITOR_TO_ELEMENT.get(editor)` WeakMap can be empty, causing a throw that
 * crashes the page.
 *
 * The patch intercepts the throw and:
 * 1. For the editor-as-node case: falls back to a DOM query for the
 *    `[data-slate-editor]` element.
 * 2. For ANY failed case: returns a disconnected div element as a safe no-op.
 *    Callers like `onDOMSelectionChange` will skip processing when
 *    `el.contains(selectionNode)` returns false on the disconnected element.
 *
 * IMPORTANT: imports `DOMEditor` from `slate-dom` (top-level 0.123.0), NOT
 * from `@udecode/slate` (nested 0.114.0 with empty WeakMaps).
 */
import { DOMEditor } from 'slate-dom'

const originalToDOMNode = DOMEditor.toDOMNode

/** Disconnected element returned when DOM resolution fails — prevents crashes. */
const FALLBACK_ELEMENT = document.createElement('div')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
DOMEditor.toDOMNode = (editor: any, node: any): HTMLElement => {
  try {
    return originalToDOMNode(editor, node)
  } catch {
    // For the editor-as-node case (used by slate-react internals for
    // selection handling, focus management, etc.), fall back to DOM query.
    if (node === editor) {
      const el = document.querySelector<HTMLElement>('[data-slate-editor="true"]')
      if (el) return el
    }
    // Return a disconnected element instead of crashing. Selection handlers
    // will see el.contains(anchorNode) === false and skip processing.
    return FALLBACK_ELEMENT
  }
}
