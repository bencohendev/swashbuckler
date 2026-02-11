export function extractTextFromContent(content: unknown): string {
  if (!content || !Array.isArray(content)) return ''

  const parts: string[] = []

  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) continue

      const n = node as Record<string, unknown>

      if (typeof n.text === 'string') {
        parts.push(n.text)
      }

      if (Array.isArray(n.children)) {
        walk(n.children)
      }
    }
  }

  walk(content)
  return parts.join(' ')
}
