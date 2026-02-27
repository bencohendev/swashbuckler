import { useEffect, useRef, useCallback } from 'react';
import type { Value } from '@udecode/plate';
import { useEditorStore } from '../store';

interface UseAutoSaveOptions {
  // Debounce delay in milliseconds (default: 1000ms)
  delay?: number;
  // Callback to save content
  onSave: (content: Value) => Promise<void>;
  // Whether auto-save is enabled
  enabled?: boolean;
  // Per-instance content ref — isolates this editor's content from the global
  // store so multiple coexisting editors (e.g., page + modal) don't interfere.
  contentRef: React.RefObject<Value | null>;
}

export function useAutoSave({
  delay = 1000,
  onSave,
  enabled = true,
  contentRef,
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);
  // Per-instance dirty flag — prevents one editor's save from stealing
  // another editor's dirty state via the global store.
  const localDirtyRef = useRef(false);

  // Keep onSave ref current
  onSaveRef.current = onSave;

  // Called by the editor's onChange handler to mark this instance dirty.
  const markDirty = useCallback(() => {
    localDirtyRef.current = true;
  }, []);

  // Called after mount to clear the false-positive dirty from Plate init onChange.
  const markClean = useCallback(() => {
    localDirtyRef.current = false;
  }, []);

  // Stable save function — uses per-instance refs for content/dirty state.
  const save = useCallback(async () => {
    if (!localDirtyRef.current) return;
    const content = contentRef.current;
    if (!content) return;

    // Mark clean immediately to prevent concurrent duplicate saves
    localDirtyRef.current = false;
    const { setSaving, setLastSaved } = useEditorStore.getState();
    setSaving(true);
    try {
      await onSaveRef.current(content);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Re-mark dirty so next change retries
      localDirtyRef.current = true;
    } finally {
      setSaving(false);
    }
  }, [contentRef]);

  // Debounced auto-save — triggers when the local dirty flag is set.
  // We subscribe to the global store's content for reactivity (it changes on
  // every keystroke via setContent), but gate the actual save on localDirtyRef
  // and read content from the per-instance contentRef. This way the effect
  // re-runs whenever ANY editor writes to the store, but only the correct
  // instance actually saves (the one whose localDirtyRef is true).
  const storeContent = useEditorStore((s) => s.content);

  useEffect(() => {
    if (!enabled || !localDirtyRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // storeContent included for reactivity — the actual save gates on localDirtyRef
    // and reads from contentRef, so store content is never saved to the wrong object.
  }, [storeContent, enabled, delay, save]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (localDirtyRef.current) {
        save();
      }
    };
  }, [save]);

  // Warn before tab close if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (localDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await save();
  }, [save]);

  // Reset dirty state without saving
  const discardChanges = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    localDirtyRef.current = false;
    useEditorStore.getState().markClean();
  }, []);

  return {
    saveNow,
    discardChanges,
    markDirty,
    markClean,
  };
}
