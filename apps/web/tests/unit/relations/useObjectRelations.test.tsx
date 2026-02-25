import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useObjectRelations } from '@/features/relations/hooks/useObjectRelations'
import { useObjects } from '@/features/objects/hooks/useObjects'
import { clearLocalData } from '@/shared/lib/data/local'
import { createHookWrapper } from '../../utils/render'

vi.mock('@/shared/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
  }),
}))

const PAGE_TYPE_ID = '00000000-0000-0000-0000-000000000101'
const Wrapper = createHookWrapper()

describe('useObjectRelations', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns empty relations for object with none', async () => {
    // Create an object first
    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let objId: string = ''
    await act(async () => {
      const obj = await objResult.current.create({ title: 'Test', type_id: PAGE_TYPE_ID })
      objId = obj!.id
    })

    const { result } = renderHook(() => useObjectRelations(objId), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.relations).toEqual([])
  })

  it('is disabled when objectId is null', async () => {
    const { result } = renderHook(() => useObjectRelations(null), { wrapper: Wrapper })

    // Should not be loading when disabled
    expect(result.current.relations).toEqual([])
  })

  it('creates a link and enriches with object data', async () => {
    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let sourceId: string = ''
    let targetId: string = ''
    await act(async () => {
      const source = await objResult.current.create({ title: 'Source', type_id: PAGE_TYPE_ID })
      const target = await objResult.current.create({ title: 'Target', type_id: PAGE_TYPE_ID, icon: '🎯' })
      sourceId = source!.id
      targetId = target!.id
    })

    const { result } = renderHook(() => useObjectRelations(sourceId), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createLink(targetId)
    })

    await waitFor(() => {
      expect(result.current.relations.length).toBe(1)
    })

    expect(result.current.relations[0].linkedObject).not.toBeNull()
    expect(result.current.relations[0].linkedObject!.title).toBe('Target')
    expect(result.current.relations[0].linkedObject!.icon).toBe('🎯')
  })

  it('removes a link', async () => {
    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let sourceId: string = ''
    let targetId: string = ''
    await act(async () => {
      const source = await objResult.current.create({ title: 'Source', type_id: PAGE_TYPE_ID })
      const target = await objResult.current.create({ title: 'Target', type_id: PAGE_TYPE_ID })
      sourceId = source!.id
      targetId = target!.id
    })

    const { result } = renderHook(() => useObjectRelations(sourceId), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createLink(targetId)
    })

    await waitFor(() => {
      expect(result.current.relations.length).toBe(1)
    })

    const relationId = result.current.relations[0].id
    await act(async () => {
      await result.current.removeLink(relationId)
    })

    await waitFor(() => {
      expect(result.current.relations.length).toBe(0)
    })
  })
})
