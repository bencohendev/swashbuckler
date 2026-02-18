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

  // Collaborative mode flag — when true, setContent skips isDirty
  isCollaborative: boolean;

  // Actions
  setContent: (content: EditorContent) => void;
  markDirty: () => void;
  markClean: () => void;
  setSaving: (isSaving: boolean) => void;
  setLastSaved: (date: Date) => void;
  setCollaborative: (isCollaborative: boolean) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  content: initialEditorValue,
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  isCollaborative: false,

  setContent: (content) =>
    set({
      content,
      // In collaborative mode, Y.Doc is the source of truth — skip dirty tracking
      isDirty: get().isCollaborative ? false : true,
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

  setCollaborative: (isCollaborative) => set({ isCollaborative }),

  reset: () =>
    set({
      content: initialEditorValue,
      isDirty: false,
      isSaving: false,
      lastSaved: null,
      isCollaborative: false,
    }),
}));
