import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the Supabase client and data client before importing the hook
const mockSpaces = [
  { id: 'space-1', name: 'Space 1' },
]

const mockListSpaces = vi.fn().mockResolvedValue({ data: mockSpaces, error: null })
const mockListObjectTypes = vi.fn().mockResolvedValue({ data: [], error: null })
const mockListTemplates = vi.fn().mockResolvedValue({ data: [], error: null })
const mockListRelations = vi.fn().mockResolvedValue({ data: [], error: null })
const mockListTags = vi.fn().mockResolvedValue({ data: [], error: null })
const mockListPins = vi.fn().mockResolvedValue({ data: [], error: null })
const mockListGlobalTypes = vi.fn().mockResolvedValue({ data: [], error: null })

const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
})

vi.mock('@/shared/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}))

vi.mock('@/shared/lib/data', () => ({
  createSupabaseDataClient: () => ({
    spaces: { list: mockListSpaces },
    objectTypes: { list: mockListObjectTypes },
    templates: { list: mockListTemplates },
    relations: { listAll: mockListRelations },
    tags: { list: mockListTags },
    pins: { list: mockListPins },
    globalObjectTypes: { list: mockListGlobalTypes },
  }),
}))

// Need to import after mocks are set up
const { useAccountExport } = await import('@/features/account/hooks/useAccountExport')

describe('useAccountExport', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:test')
    mockRevokeObjectURL = vi.fn()
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL },
      writable: true,
    })
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useAccountExport())

    expect(result.current.isExporting).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.exportData).toBe('function')
  })

  it('sets isExporting during export', async () => {
    const { result } = renderHook(() => useAccountExport())

    let exportPromise: Promise<void>
    act(() => {
      exportPromise = result.current.exportData()
    })

    expect(result.current.isExporting).toBe(true)

    await act(async () => {
      await exportPromise!
    })

    expect(result.current.isExporting).toBe(false)
  })

  it('creates a download link on successful export', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)

    const { result } = renderHook(() => useAccountExport())

    await act(async () => {
      await result.current.exportData()
    })

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test')

    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('sets error on failure', async () => {
    mockListSpaces.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAccountExport())

    await act(async () => {
      await result.current.exportData()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    })
    expect(result.current.isExporting).toBe(false)
  })

  it('sets error when spaces.list returns error', async () => {
    mockListSpaces.mockResolvedValueOnce({ data: [], error: { message: 'Unauthorized' } })

    const { result } = renderHook(() => useAccountExport())

    await act(async () => {
      await result.current.exportData()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('Unauthorized')
    })
  })
})
