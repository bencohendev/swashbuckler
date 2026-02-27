import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createRef } from 'react'
import type { Value } from '@udecode/plate'
import { useAutoSave } from '@/features/editor/hooks/useAutoSave'
import { useEditorStore } from '@/features/editor/store'

describe('useAutoSave', () => {
  const onSave = vi.fn<(content: unknown) => Promise<void>>().mockResolvedValue(undefined)
  const contentRef = createRef<Value | null>() as React.MutableRefObject<Value | null>

  beforeEach(() => {
    vi.useFakeTimers()
    useEditorStore.getState().reset()
    onSave.mockClear()
    onSave.mockResolvedValue(undefined)
    contentRef.current = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** Simulate an editor onChange: update the content ref, mark dirty, update store */
  function simulateChange(result: { current: ReturnType<typeof useAutoSave> }, content: Value) {
    contentRef.current = content
    result.current.markDirty()
    // Also update global store for reactivity (triggers re-render)
    useEditorStore.getState().setContent(content)
  }

  it('calls onSave after debounce when dirty', async () => {
    const { result } = renderHook(() => useAutoSave({ onSave, delay: 1000, contentRef }))

    // Simulate typing
    act(() => {
      simulateChange(result, [{ type: 'p', children: [{ text: 'hello' }] }])
    })

    // Advance past the debounce
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith([{ type: 'p', children: [{ text: 'hello' }] }])
  })

  it('does not call onSave when enabled=false', async () => {
    const { result } = renderHook(() => useAutoSave({ onSave, delay: 1000, enabled: false, contentRef }))

    act(() => {
      simulateChange(result, [{ type: 'p', children: [{ text: 'hello' }] }])
    })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not call onSave when not dirty', async () => {
    renderHook(() => useAutoSave({ onSave, delay: 1000, contentRef }))

    // Do not make content dirty
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('saveNow triggers immediate save and cancels pending debounce', async () => {
    const { result } = renderHook(() => useAutoSave({ onSave, delay: 5000, contentRef }))

    // Make dirty
    act(() => {
      simulateChange(result, [{ type: 'p', children: [{ text: 'urgent' }] }])
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
    const { result } = renderHook(() => useAutoSave({ onSave, delay: 1000, contentRef }))

    // Make dirty
    act(() => {
      simulateChange(result, [{ type: 'p', children: [{ text: 'draft' }] }])
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

    const { result } = renderHook(() => useAutoSave({ onSave, delay: 1000, contentRef }))

    act(() => {
      simulateChange(result, [{ type: 'p', children: [{ text: 'will fail' }] }])
    })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // After failure, store isDirty should still be true (from setContent)
    // and the local dirty flag is re-set for retry
    expect(useEditorStore.getState().isDirty).toBe(true)
  })

  it('setLastSaved is called on successful save', async () => {
    const { result } = renderHook(() => useAutoSave({ onSave, delay: 1000, contentRef }))

    act(() => {
      simulateChange(result, [{ type: 'p', children: [{ text: 'save me' }] }])
    })

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(useEditorStore.getState().lastSaved).not.toBeNull()
  })

  it('uses per-instance content ref instead of global store', async () => {
    const refA = { current: null as Value | null }
    const refB = { current: null as Value | null }
    const onSaveA = vi.fn<(content: unknown) => Promise<void>>().mockResolvedValue(undefined)
    const onSaveB = vi.fn<(content: unknown) => Promise<void>>().mockResolvedValue(undefined)

    // Mount two auto-save instances (simulating page + modal editors)
    const { result: resultA } = renderHook(() =>
      useAutoSave({ onSave: onSaveA, delay: 1000, contentRef: refA })
    )
    const { result: resultB } = renderHook(() =>
      useAutoSave({ onSave: onSaveB, delay: 1000, contentRef: refB })
    )

    // Editor A writes content
    act(() => {
      refA.current = [{ type: 'p', children: [{ text: 'page content' }] }]
      resultA.current.markDirty()
      useEditorStore.getState().setContent(refA.current)
    })

    // Editor B writes different content
    act(() => {
      refB.current = [{ type: 'p', children: [{ text: 'modal content' }] }]
      resultB.current.markDirty()
      useEditorStore.getState().setContent(refB.current)
    })

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Each editor should save its OWN content from its ref
    expect(onSaveA).toHaveBeenCalledWith([{ type: 'p', children: [{ text: 'page content' }] }])
    expect(onSaveB).toHaveBeenCalledWith([{ type: 'p', children: [{ text: 'modal content' }] }])
  })
})
