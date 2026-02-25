import type { Value } from '@udecode/plate'

const EMPTY_PARAGRAPH: Value = [{ type: 'p', children: [{ text: '' }] }]

/**
 * Merge template content with existing entry content.
 *
 * - `replace`: returns template content (discards existing)
 * - `prepend`: returns template content followed by existing content
 */
export function applyTemplateContent(
  templateContent: Value | null,
  existingContent: Value | null,
  mode: 'replace' | 'prepend'
): Value {
  const template = templateContent && templateContent.length > 0
    ? (JSON.parse(JSON.stringify(templateContent)) as Value)
    : null
  const existing = existingContent && existingContent.length > 0
    ? existingContent
    : null

  if (mode === 'replace') {
    return template ?? EMPTY_PARAGRAPH
  }

  // prepend: template first, then existing
  if (!template) return existing ?? EMPTY_PARAGRAPH
  if (!existing) return template
  return [...template, ...existing] as Value
}

/**
 * Fill empty fields from template properties into existing properties.
 * Only copies values for keys that are absent or empty-string in existing.
 */
export function mergeProperties(
  templateProperties: Record<string, unknown>,
  existingProperties: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...existingProperties }

  for (const [key, value] of Object.entries(templateProperties)) {
    const existing = merged[key]
    if (existing === undefined || existing === null || existing === '') {
      merged[key] = value
    }
  }

  return merged
}
