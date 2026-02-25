/**
 * A curated palette of distinct, accessible colors for graph nodes.
 * Each color is chosen to be visually distinguishable from the others.
 */
const GRAPH_PALETTE = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#a855f7', // purple
  '#84cc16', // lime
  '#e11d48', // rose
]

/**
 * Simple hash of a string to a number.
 */
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Build a map from type ID → color, using the type's explicit color if set,
 * otherwise assigning a deterministic color from the palette.
 */
export function buildTypeColorMap(types: Iterable<{ id: string; color: string | null }>): Map<string, string> {
  const colorMap = new Map<string, string>()
  // Track which palette indices are taken by explicit assignments
  const usedPaletteIndices = new Set<number>()

  // First pass: assign explicit colors and compute preferred palette indices
  const needsColor: { id: string; preferredIndex: number }[] = []
  for (const t of types) {
    if (t.color) {
      colorMap.set(t.id, t.color)
    } else {
      needsColor.push({ id: t.id, preferredIndex: hashString(t.id) % GRAPH_PALETTE.length })
    }
  }

  // Second pass: assign palette colors, avoiding collisions where possible
  for (const { id, preferredIndex } of needsColor) {
    let idx = preferredIndex
    // If preferred index is taken, find next available
    let attempts = 0
    while (usedPaletteIndices.has(idx) && attempts < GRAPH_PALETTE.length) {
      idx = (idx + 1) % GRAPH_PALETTE.length
      attempts++
    }
    usedPaletteIndices.add(idx)
    colorMap.set(id, GRAPH_PALETTE[idx])
  }

  return colorMap
}
