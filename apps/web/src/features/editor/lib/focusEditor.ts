/**
 * Restores focus to the Slate editor after node mutations that destroy
 * the previously-focused element (e.g., removing a mention_input or
 * slash_input whose filter input held focus).
 *
 * Unlike a plain `el.focus()`, this also sets the DOM selection from
 * Slate's selection BEFORE focusing.  Without this, the browser places
 * the cursor at a default position (usually the beginning) and Slate's
 * throttled `onDOMSelectionChange` handler corrects it later, causing a
 * visible cursor jump.
 *
 * Uses `DOMEditor` from the top-level `slate-dom` (0.123.0) to avoid
 * the dual-package WeakMap issue with `@udecode/slate`'s nested copy.
 */
import { DOMEditor } from 'slate-dom'

// Use a loose type so both Plate editors and raw Slate editors work.
// DOMEditor.toDOMRange accepts DOMEditor at the type level, but at
// runtime it only needs `editor.selection` — the cast is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlateEditor = { selection: any } & Record<string, any>

/**
 * Synchronously focus the editor and restore the DOM selection.
 * Call this when the DOM is already up-to-date (e.g., inside a
 * setTimeout that already waited for React to commit).
 */
export function focusEditorNow(editor: SlateEditor) {
  const el = document.querySelector<HTMLElement>('[data-slate-editor="true"]')
  if (!el) return

  // Set DOM selection BEFORE focusing to prevent cursor jump
  if (editor.selection) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domRange = DOMEditor.toDOMRange(editor as any, editor.selection)
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(domRange)
      }
    } catch {
      // toDOMRange can fail if WeakMap is stale; fall through to plain focus
    }
  }

  el.focus({ preventScroll: true })
}

/**
 * Deferred version — waits one tick for React to commit DOM changes,
 * then focuses and restores selection.
 */
export function focusEditorAtSelection(editor: SlateEditor) {
  setTimeout(() => focusEditorNow(editor), 0)
}
