import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoSave } from '@/features/editor/hooks/useAutoSave'
import { useEditorStore } from '@/features/editor/store'

describe('useAutoSave', () => {
  const onSave = vi.fn<(content: unknown) => Promise<void>>().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.useFakeTimers()
    useEditorStore.getState().reset()
    onSave.mockClear()
    onSave.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls onSave after debounce when isDirty', async () => {
    renderHook(() => useAutoSave({ onSave, delay: 1000 }))

    // Mark content as dirty
    act(() => {
      useEditorStore.getState().setContent([{ type: 'p', children: [{ text: 'hello' }] }])
    })

    // Advance past the debounce
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('does not call onSave when enabled=false', async () => {
    renderHook(() => useAutoSave({ onSave, delay: 1000, enabled: false }))

    act(() => {
      useEditorStore.getState().setContent([{ type: 'p', children: [{ text: 'hello' }] }])
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not call onSave when isDirty=false', async () => {
    renderHook(() => useAutoSave({ onSave, delay: 1000 }))

    // Do not make content dirty
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('saveNow triggers immediate save and cancels pending debounce', async () => {
    const { result } = renderHook(() => useAutoSave({ onSave, delay: 5000 }))

    // Make dirty
    act(() => {
      useEditorStore.getState().setContent([{ type: 'p', children: [{ text: 'urgent' }] }])
    })

    // Save immediately without waiting for debounce
    await act(async () => {
      await result.current.saveNow()
    })

    expect(onSave).toHaveBeenCalledTimes(1)

    // Advancing time should not trigger another save
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('discardChanges clears dirty state without saving', async () => {
    const { result } = renderHook(() => useAutoSave({ onSave, delay: 1000 }))

    // Make dirty
    act(() => {
      useEditorStore.getState().setContent([{ type: 'p', children: [{ text: 'draft' }] }])
    })

    // Discard
    act(() => {
      result.current.discardChanges()
    })

    expect(useEditorStore.getState().isDirty).toBe(false)

    // Advance time — should not save since dirty was cleared
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('save failure re-marks dirty for retry', async () => {
    onSave.mockRejectedValueOnce(new Error('save failed'))

    renderHook(() => useAutoSave({ onSave, delay: 1000 }))

    act(() => {
      useEditorStore.getState().setContent([{ type: 'p', children: [{ text: 'will fail' }] }])
    })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // After failure, isDirty should be true again
    expect(useEditorStore.getState().isDirty).toBe(true)
  })

  it('setLastSaved is called on successful save', async () => {
    renderHook(() => useAutoSave({ onSave, delay: 1000 }))

    act(() => {
      useEditorStore.getState().setContent([{ type: 'p', children: [{ text: 'save me' }] }])
    })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(useEditorStore.getState().lastSaved).not.toBeNull()
    expect(useEditorStore.getState().isDirty).toBe(false)
  })
})
