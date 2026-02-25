import type { Value } from '@udecode/plate'

export function extractMentionIds(content: Value): string[] {
  const ids = new Set<string>()

  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) continue

      const n = node as Record<string, unknown>

      if (n.type === 'mention' && typeof n.objectId === 'string') {
        ids.add(n.objectId)
      }

      if (Array.isArray(n.children)) {
        walk(n.children)
      }
    }
  }

  walk(content)
  return [...ids]
}
