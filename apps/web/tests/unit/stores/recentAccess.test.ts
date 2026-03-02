import { describe, it, expect, beforeEach } from 'vitest'
import { useRecentAccess } from '@/shared/stores/recentAccess'

describe('useRecentAccess', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset store state between tests
    useRecentAccess.setState({ spaceId: null, entries: [] })
  })

  describe('init', () => {
    it('loads entries from localStorage', () => {
      const spaceId = 'space-1'
      const stored = [
        { id: 'obj-1', accessedAt: 1000 },
        { id: 'obj-2', accessedAt: 2000 },
      ]
      localStorage.setItem(`swashbuckler:recentAccess:${spaceId}`, JSON.stringify(stored))

      useRecentAccess.getState().init(spaceId)

      expect(useRecentAccess.getState().spaceId).toBe(spaceId)
      expect(useRecentAccess.getState().entries).toEqual(stored)
    })

    it('handles empty localStorage', () => {
      useRecentAccess.getState().init('space-1')

      expect(useRecentAccess.getState().entries).toEqual([])
    })

    it('handles corrupted localStorage', () => {
      localStorage.setItem('swashbuckler:recentAccess:space-1', 'not json')
      useRecentAccess.getState().init('space-1')

      expect(useRecentAccess.getState().entries).toEqual([])
    })

    it('handles non-array JSON in localStorage', () => {
      localStorage.setItem('swashbuckler:recentAccess:space-1', '"string"')
      useRecentAccess.getState().init('space-1')

      expect(useRecentAccess.getState().entries).toEqual([])
    })

    it('filters out malformed entries from localStorage', () => {
      const stored = [
        { id: 'valid', accessedAt: 1000 },
        { id: 123, accessedAt: 2000 }, // bad id
        { id: 'missing-ts' },          // missing accessedAt
        null,                            // null
      ]
      localStorage.setItem('swashbuckler:recentAccess:space-1', JSON.stringify(stored))
      useRecentAccess.getState().init('space-1')

      expect(useRecentAccess.getState().entries).toEqual([
        { id: 'valid', accessedAt: 1000 },
      ])
    })

    it('skips re-initialization for same spaceId', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')

      // Re-init same space — should NOT reload from localStorage (which has stale data)
      useRecentAccess.getState().init('space-1')
      expect(useRecentAccess.getState().entries.length).toBe(1)
    })

    it('reloads when switching spaces', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')

      useRecentAccess.getState().init('space-2')
      expect(useRecentAccess.getState().spaceId).toBe('space-2')
      expect(useRecentAccess.getState().entries).toEqual([])
    })
  })

  describe('trackAccess', () => {
    it('adds a new entry at the front', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')

      const entries = useRecentAccess.getState().entries
      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('obj-1')
    })

    it('moves existing entry to front (deduplication)', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')
      useRecentAccess.getState().trackAccess('obj-2')
      useRecentAccess.getState().trackAccess('obj-1')

      const entries = useRecentAccess.getState().entries
      expect(entries).toHaveLength(2)
      expect(entries[0].id).toBe('obj-1')
      expect(entries[1].id).toBe('obj-2')
    })

    it('caps at 50 entries', () => {
      useRecentAccess.getState().init('space-1')
      for (let i = 0; i < 55; i++) {
        useRecentAccess.getState().trackAccess(`obj-${i}`)
      }

      expect(useRecentAccess.getState().entries).toHaveLength(50)
      // Most recent should be first
      expect(useRecentAccess.getState().entries[0].id).toBe('obj-54')
    })

    it('does nothing if spaceId not initialized', () => {
      useRecentAccess.getState().trackAccess('obj-1')
      expect(useRecentAccess.getState().entries).toEqual([])
    })

    it('persists to localStorage', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')

      const stored = JSON.parse(localStorage.getItem('swashbuckler:recentAccess:space-1')!)
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('obj-1')
    })
  })

  describe('removeEntry', () => {
    it('removes an entry by id', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')
      useRecentAccess.getState().trackAccess('obj-2')

      useRecentAccess.getState().removeEntry('obj-1')

      const entries = useRecentAccess.getState().entries
      expect(entries).toHaveLength(1)
      expect(entries[0].id).toBe('obj-2')
    })

    it('does nothing for non-existent id', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')

      useRecentAccess.getState().removeEntry('nonexistent')

      expect(useRecentAccess.getState().entries).toHaveLength(1)
    })

    it('does nothing if spaceId not initialized', () => {
      useRecentAccess.getState().removeEntry('obj-1')
      expect(useRecentAccess.getState().entries).toEqual([])
    })
  })

  describe('getRecentIds', () => {
    it('returns limited list of ids', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')
      useRecentAccess.getState().trackAccess('obj-2')
      useRecentAccess.getState().trackAccess('obj-3')

      expect(useRecentAccess.getState().getRecentIds(2)).toEqual(['obj-3', 'obj-2'])
    })

    it('returns all ids if limit exceeds count', () => {
      useRecentAccess.getState().init('space-1')
      useRecentAccess.getState().trackAccess('obj-1')

      expect(useRecentAccess.getState().getRecentIds(10)).toEqual(['obj-1'])
    })
  })
})
