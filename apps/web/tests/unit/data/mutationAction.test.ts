import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMutationAction, useVoidMutationAction } from '@/shared/hooks/useMutationAction'
import { toast } from '@/shared/hooks/useToast'
import { emit } from '@/shared/lib/data/events'
import type { DataResult } from '@/shared/lib/data/types'

vi.mock('@/shared/hooks/useToast', () => ({
  toast: vi.fn(),
}))

vi.mock('@/shared/lib/data/events', () => ({
  emit: vi.fn(),
}))

const mockToast = vi.mocked(toast)
const mockEmit = vi.mocked(emit)

describe('useMutationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data on success', async () => {
    type Item = { id: string; name: string }
    const fn = vi.fn<() => Promise<DataResult<Item>>>()
      .mockResolvedValue({ data: { id: '1', name: 'Test' }, error: null })

    const { result } = renderHook(() =>
      useMutationAction(fn, { actionLabel: 'Create' }),
    )

    let data: Item | null = null
    await act(async () => {
      data = await result.current()
    })

    expect(data).toEqual({ id: '1', name: 'Test' })
  })

  it('returns null on failure', async () => {
    const fn = vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed' } })

    const { result } = renderHook(() =>
      useMutationAction(fn, { actionLabel: 'Create' }),
    )

    let data: unknown = 'sentinel'
    await act(async () => {
      data = await result.current()
    })

    expect(data).toBeNull()
  })

  it('shows toast on failure', async () => {
    const fn = vi.fn().mockResolvedValue({ data: null, error: { message: 'Duplicate key' } })

    const { result } = renderHook(() =>
      useMutationAction(fn, { actionLabel: 'Create type' }),
    )

    await act(async () => {
      await result.current()
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Create type',
      description: 'Duplicate key',
      variant: 'destructive',
    })
  })

  it('does not show toast on success', async () => {
    const fn = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })

    const { result } = renderHook(() =>
      useMutationAction(fn, { actionLabel: 'Create' }),
    )

    await act(async () => {
      await result.current()
    })

    expect(mockToast).not.toHaveBeenCalled()
  })

  it('emits channels on success', async () => {
    const fn = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })

    const { result } = renderHook(() =>
      useMutationAction(fn, { actionLabel: 'Create', emitChannels: ['objects', 'tags'] }),
    )

    await act(async () => {
      await result.current()
    })

    expect(mockEmit).toHaveBeenCalledWith('objects')
    expect(mockEmit).toHaveBeenCalledWith('tags')
    expect(mockEmit).toHaveBeenCalledTimes(2)
  })

  it('does NOT emit channels on failure', async () => {
    const fn = vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed' } })

    const { result } = renderHook(() =>
      useMutationAction(fn, { actionLabel: 'Create', emitChannels: ['objects'] }),
    )

    await act(async () => {
      await result.current()
    })

    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('calls onSuccess callback on success', async () => {
    const onSuccess = vi.fn()
    const fn = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })

    const { result } = renderHook(() =>
      useMutationAction(fn, { actionLabel: 'Create', onSuccess }),
    )

    await act(async () => {
      await result.current()
    })

    expect(onSuccess).toHaveBeenCalledWith({ id: '1' })
  })

  it('does NOT call onSuccess on failure', async () => {
    const onSuccess = vi.fn()
    const fn = vi.fn().mockResolvedValue({ data: null, error: { message: 'err' } })

    const { result } = renderHook(() =>
      useMutationAction(fn, { actionLabel: 'Create', onSuccess }),
    )

    await act(async () => {
      await result.current()
    })

    expect(onSuccess).not.toHaveBeenCalled()
  })
})

describe('useVoidMutationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true on success', async () => {
    const fn = vi.fn().mockResolvedValue({ data: undefined, error: null } satisfies DataResult<void>)

    const { result } = renderHook(() =>
      useVoidMutationAction(fn, { actionLabel: 'Delete' }),
    )

    let ok = false
    await act(async () => {
      ok = await result.current()
    })

    expect(ok).toBe(true)
  })

  it('returns false on failure', async () => {
    const fn = vi.fn().mockResolvedValue({ data: undefined, error: { message: 'Failed' } })

    const { result } = renderHook(() =>
      useVoidMutationAction(fn, { actionLabel: 'Delete' }),
    )

    let ok = true
    await act(async () => {
      ok = await result.current()
    })

    expect(ok).toBe(false)
  })

  it('shows toast on failure', async () => {
    const fn = vi.fn().mockResolvedValue({ data: undefined, error: { message: 'Permission denied' } })

    const { result } = renderHook(() =>
      useVoidMutationAction(fn, { actionLabel: 'Delete object' }),
    )

    await act(async () => {
      await result.current()
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Delete object',
      description: 'Permission denied',
      variant: 'destructive',
    })
  })

  it('emits channels on success, not on failure', async () => {
    const successFn = vi.fn().mockResolvedValue({ data: undefined, error: null })
    const failFn = vi.fn().mockResolvedValue({ data: undefined, error: { message: 'err' } })

    const { result: successResult } = renderHook(() =>
      useVoidMutationAction(successFn, { actionLabel: 'Delete', emitChannels: ['objects'] }),
    )
    const { result: failResult } = renderHook(() =>
      useVoidMutationAction(failFn, { actionLabel: 'Delete', emitChannels: ['objects'] }),
    )

    await act(async () => {
      await successResult.current()
    })
    expect(mockEmit).toHaveBeenCalledWith('objects')

    mockEmit.mockClear()

    await act(async () => {
      await failResult.current()
    })
    expect(mockEmit).not.toHaveBeenCalled()
  })
})
