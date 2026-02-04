import { create } from 'zustand';
import type { EditorContent } from './types';
import { initialEditorValue } from './lib/plate-config';

interface EditorState {
  // Current content
  content: EditorContent;

  // Dirty state for auto-save
  isDirty: boolean;

  // Saving state
  isSaving: boolean;

  // Last saved timestamp
  lastSaved: Date | null;

  // Actions
  setContent: (content: EditorContent) => void;
  markDirty: () => void;
  markClean: () => void;
  setSaving: (isSaving: boolean) => void;
  setLastSaved: (date: Date) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  content: initialEditorValue,
  isDirty: false,
  isSaving: false,
  lastSaved: null,

  setContent: (content) =>
    set({
      content,
      isDirty: true,
    }),

  markDirty: () => set({ isDirty: true }),

  markClean: () => set({ isDirty: false }),

  setSaving: (isSaving) => set({ isSaving }),

  setLastSaved: (date) =>
    set({
      lastSaved: date,
      isDirty: false,
      isSaving: false,
    }),

  reset: () =>
    set({
      content: initialEditorValue,
      isDirty: false,
      isSaving: false,
      lastSaved: null,
    }),
}));
