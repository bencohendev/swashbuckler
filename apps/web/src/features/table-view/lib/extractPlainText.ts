import type { Value } from '@udecode/plate'

const SKIP_TYPES = new Set(['img', 'code_block', 'table'])

export function extractPlainText(content: Value, maxLength = 120): string {
  let result = ''

  function walk(nodes: unknown[], isTopLevel = false) {
    for (const node of nodes) {
      if (result.length >= maxLength) return

      if (typeof node !== 'object' || node === null) continue
      const n = node as Record<string, unknown>

      if (typeof n.type === 'string' && SKIP_TYPES.has(n.type)) continue

      if (typeof n.text === 'string' && n.text.length > 0) {
        result += n.text
        if (result.length >= maxLength) return
      }

      if (Array.isArray(n.children)) {
        walk(n.children)
      }

      // Add space between top-level blocks
      if (isTopLevel && result.length > 0 && !result.endsWith(' ')) {
        result += ' '
      }
    }
  }

  walk(content, true)

  result = result.trim()
  if (result.length > maxLength) {
    return result.slice(0, maxLength) + '…'
  }
  return result
}
