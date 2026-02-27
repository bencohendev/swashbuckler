/**
 * Patches `DOMEditor.toDOMNode` from the top-level `slate-dom` package to
 * not throw when the editor element can't be found in the WeakMap.
 *
 * WHY: `slate-react`'s `onDOMSelectionChange` is throttled (~100ms) and calls
 * `ReactEditor.toDOMNode(editor, editor)` without try-catch. During React
 * Strict Mode double-renders or timing gaps between unmount/remount,
 * `EDITOR_TO_ELEMENT.get(editor)` is empty and the call throws, crashing the
 * page. See: slate-react/dist/index.es.js line 1532.
 *
 * The patch intercepts the throw and falls back to a DOM query for the
 * `[data-slate-editor]` element, which is always available when the editor is
 * mounted. For non-editor nodes, the original throw is preserved so callers
 * that rely on the error can still handle it.
 *
 * IMPORTANT: imports `DOMEditor` from `slate-dom` (top-level 0.123.0), NOT
 * from `@udecode/slate` (nested 0.114.0 with empty WeakMaps).
 */
import { DOMEditor } from 'slate-dom'

const originalToDOMNode = DOMEditor.toDOMNode

// eslint-disable-next-line @typescript-eslint/no-explicit-any
DOMEditor.toDOMNode = (editor: any, node: any): HTMLElement => {
  try {
    return originalToDOMNode(editor, node)
  } catch (error) {
    // For the editor-as-node case (used by slate-react internals for
    // selection handling, focus management, etc.), fall back to DOM query.
    if (node === editor) {
      const el = document.querySelector<HTMLElement>('[data-slate-editor="true"]')
      if (el) return el
    }
    // For element nodes, re-throw — callers may rely on the error.
    throw error
  }
}
