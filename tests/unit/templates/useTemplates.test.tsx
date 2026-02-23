import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTemplates } from '@/features/templates/hooks/useTemplates'
import { useObjects } from '@/features/objects/hooks/useObjects'
import { useObjectTypes } from '@/features/object-types/hooks/useObjectTypes'
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

describe('useTemplates', () => {
  beforeEach(async () => {
    await clearLocalData()
  })

  it('returns empty templates initially', async () => {
    const { result } = renderHook(() => useTemplates(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.templates).toEqual([])
  })

  it('saves an object as template and lists it', async () => {
    // Create an object
    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let obj: Awaited<ReturnType<typeof objResult.current.create>> = null
    await act(async () => {
      obj = await objResult.current.create({
        title: 'Template Source',
        type_id: PAGE_TYPE_ID,
        icon: '📋',
      })
    })

    const { result } = renderHook(() => useTemplates(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.saveObjectAsTemplate(obj!, 'My Template')
    })

    await waitFor(() => {
      expect(result.current.templates.length).toBe(1)
    })

    expect(result.current.templates[0].name).toBe('My Template')
  })

  it('deletes a template', async () => {
    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let obj: Awaited<ReturnType<typeof objResult.current.create>> = null
    await act(async () => {
      obj = await objResult.current.create({ title: 'Source', type_id: PAGE_TYPE_ID })
    })

    const { result } = renderHook(() => useTemplates(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let template: Awaited<ReturnType<typeof result.current.saveObjectAsTemplate>> = null
    await act(async () => {
      template = await result.current.saveObjectAsTemplate(obj!, 'ToDelete')
    })

    await waitFor(() => {
      expect(result.current.templates.length).toBe(1)
    })

    await act(async () => {
      await result.current.deleteTemplate(template!.id)
    })

    await waitFor(() => {
      expect(result.current.templates.length).toBe(0)
    })
  })

  it('filters by typeId', async () => {
    // Create a second type
    const { result: typeResult } = renderHook(() => useObjectTypes(), { wrapper: Wrapper })
    await waitFor(() => expect(typeResult.current.isLoading).toBe(false))

    let noteTypeId: string = ''
    await act(async () => {
      const noteType = await typeResult.current.create({
        name: 'Note', plural_name: 'Notes', slug: 'note', icon: 'sticky-note',
      })
      noteTypeId = noteType!.id
    })

    const { result: objResult } = renderHook(() => useObjects(), { wrapper: Wrapper })
    await waitFor(() => expect(objResult.current.isLoading).toBe(false))

    let pageObj: Awaited<ReturnType<typeof objResult.current.create>> = null
    let noteObj: Awaited<ReturnType<typeof objResult.current.create>> = null
    await act(async () => {
      pageObj = await objResult.current.create({ title: 'Page', type_id: PAGE_TYPE_ID })
      noteObj = await objResult.current.create({ title: 'Note', type_id: noteTypeId })
    })

    // Create templates via the unfiltered hook
    const { result: allTemplates } = renderHook(() => useTemplates(), { wrapper: Wrapper })
    await waitFor(() => expect(allTemplates.current.isLoading).toBe(false))

    await act(async () => {
      await allTemplates.current.saveObjectAsTemplate(pageObj!, 'Page Template')
      await allTemplates.current.saveObjectAsTemplate(noteObj!, 'Note Template')
    })

    await waitFor(() => {
      expect(allTemplates.current.templates.length).toBe(2)
    })

    // Now check filtering
    const { result: noteTemplates } = renderHook(
      () => useTemplates({ typeId: noteTypeId }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(noteTemplates.current.isLoading).toBe(false)
    })

    expect(noteTemplates.current.templates.length).toBe(1)
    expect(noteTemplates.current.templates[0].name).toBe('Note Template')
  })
})
