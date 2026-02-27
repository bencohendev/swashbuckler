import type { Value } from '@udecode/plate'

/**
 * Returns valid Plate content or `null` if the input is malformed.
 *
 * Checks that content is a non-empty array where every top-level node has
 * `type` (string) and `children` (array). Doesn't deep-validate nested
 * children — Plate's own normalizer handles that.
 */
export function sanitizeContent(content: unknown): Value | null {
  if (!Array.isArray(content) || content.length === 0) return null

  for (const node of content) {
    if (
      typeof node !== 'object' ||
      node === null ||
      typeof node.type !== 'string' ||
      !Array.isArray(node.children)
    ) {
      console.warn('[Editor] Dropping malformed content node:', node)
      return null
    }
  }

  return content as Value
}
