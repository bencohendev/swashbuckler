/**
 * Returns the next available "New {typeName}" name that doesn't
 * collide with any existing title. The first entry gets no number suffix;
 * subsequent ones get " 2", " 3", etc.
 *
 * Never fills gaps — always picks the next number after the highest existing.
 */
export function getNextDefaultName(typeName: string, existingTitles: string[]): string {
  const base = `New ${typeName}`

  if (!existingTitles.includes(base)) return base

  const pattern = new RegExp(`^${escapeRegExp(base)} (\\d+)$`)
  let max = 1 // base (no suffix) counts as 1
  for (const title of existingTitles) {
    const match = title.match(pattern)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > max) max = num
    }
  }

  return `${base} ${max + 1}`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
