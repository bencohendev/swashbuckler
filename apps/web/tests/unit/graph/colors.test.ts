import { describe, it, expect } from 'vitest'
import { buildTypeColorMap } from '@/features/graph/lib/colors'

describe('buildTypeColorMap', () => {
  it('uses explicit colors when set', () => {
    const types = [
      { id: 'type-1', color: '#ff0000' },
      { id: 'type-2', color: '#00ff00' },
    ]
    const map = buildTypeColorMap(types)

    expect(map.get('type-1')).toBe('#ff0000')
    expect(map.get('type-2')).toBe('#00ff00')
  })

  it('assigns palette colors for types without explicit color', () => {
    const types = [
      { id: 'type-1', color: null },
      { id: 'type-2', color: null },
    ]
    const map = buildTypeColorMap(types)

    expect(map.get('type-1')).toBeDefined()
    expect(map.get('type-2')).toBeDefined()
    // Both should be valid hex colors
    expect(map.get('type-1')).toMatch(/^#[0-9a-f]{6}$/)
    expect(map.get('type-2')).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('is deterministic — same input produces same output', () => {
    const types = [
      { id: 'type-a', color: null },
      { id: 'type-b', color: null },
    ]
    const map1 = buildTypeColorMap(types)
    const map2 = buildTypeColorMap(types)

    expect(map1.get('type-a')).toBe(map2.get('type-a'))
    expect(map1.get('type-b')).toBe(map2.get('type-b'))
  })

  it('avoids palette index collisions when possible', () => {
    // Create 12 types to fill the entire palette — each should get a unique color
    const types = Array.from({ length: 12 }, (_, i) => ({
      id: `type-${i}`,
      color: null,
    }))
    const map = buildTypeColorMap(types)
    const colors = [...map.values()]
    const uniqueColors = new Set(colors)

    expect(uniqueColors.size).toBe(12)
  })

  it('mixes explicit and palette-assigned colors', () => {
    const types = [
      { id: 'explicit', color: '#custom1' },
      { id: 'auto-1', color: null },
      { id: 'auto-2', color: null },
    ]
    const map = buildTypeColorMap(types)

    expect(map.get('explicit')).toBe('#custom1')
    expect(map.get('auto-1')).toMatch(/^#[0-9a-f]{6}$/)
    expect(map.get('auto-2')).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('handles empty input', () => {
    const map = buildTypeColorMap([])
    expect(map.size).toBe(0)
  })

  it('handles single type', () => {
    const map = buildTypeColorMap([{ id: 'only', color: null }])
    expect(map.size).toBe(1)
    expect(map.get('only')).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('handles more types than palette slots (wraps around)', () => {
    const types = Array.from({ length: 15 }, (_, i) => ({
      id: `type-${i}`,
      color: null,
    }))
    const map = buildTypeColorMap(types)
    expect(map.size).toBe(15)
    // All should have valid colors even if some collide
    for (const color of map.values()) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
