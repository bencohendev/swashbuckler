import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '@/features/editor/store'

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().reset()
  })

  it('starts with initial state', () => {
    const state = useEditorStore.getState()

    expect(state.isDirty).toBe(false)
    expect(state.isSaving).toBe(false)
    expect(state.lastSaved).toBeNull()
    expect(state.isCollaborative).toBe(false)
  })

  it('setContent marks isDirty true', () => {
    const newContent = [{ type: 'p', children: [{ text: 'hello' }] }]
    useEditorStore.getState().setContent(newContent)

    const state = useEditorStore.getState()
    expect(state.isDirty).toBe(true)
    expect(state.content).toEqual(newContent)
  })

  it('markDirty sets isDirty to true', () => {
    useEditorStore.getState().markDirty()

    expect(useEditorStore.getState().isDirty).toBe(true)
  })

  it('markClean sets isDirty to false', () => {
    useEditorStore.getState().markDirty()
    useEditorStore.getState().markClean()

    expect(useEditorStore.getState().isDirty).toBe(false)
  })

  it('setSaving updates isSaving', () => {
    useEditorStore.getState().setSaving(true)
    expect(useEditorStore.getState().isSaving).toBe(true)

    useEditorStore.getState().setSaving(false)
    expect(useEditorStore.getState().isSaving).toBe(false)
  })

  it('setLastSaved sets isDirty=false AND isSaving=false', () => {
    // Start with dirty + saving state
    useEditorStore.getState().markDirty()
    useEditorStore.getState().setSaving(true)

    const now = new Date()
    useEditorStore.getState().setLastSaved(now)

    const state = useEditorStore.getState()
    expect(state.isDirty).toBe(false)
    expect(state.isSaving).toBe(false)
    expect(state.lastSaved).toBe(now)
  })

  it('setCollaborative updates isCollaborative', () => {
    useEditorStore.getState().setCollaborative(true)
    expect(useEditorStore.getState().isCollaborative).toBe(true)

    useEditorStore.getState().setCollaborative(false)
    expect(useEditorStore.getState().isCollaborative).toBe(false)
  })

  it('reset returns all to initial state', () => {
    // Modify everything
    useEditorStore.getState().setContent([{ type: 'p', children: [{ text: 'modified' }] }])
    useEditorStore.getState().setSaving(true)
    useEditorStore.getState().setCollaborative(true)
    useEditorStore.getState().setLastSaved(new Date())

    useEditorStore.getState().reset()

    const state = useEditorStore.getState()
    expect(state.isDirty).toBe(false)
    expect(state.isSaving).toBe(false)
    expect(state.lastSaved).toBeNull()
    expect(state.isCollaborative).toBe(false)
  })
})
