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
}

export function useAutoSave({
  delay = 1000,
  onSave,
  enabled = true,
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);
  const { content, isDirty } = useEditorStore();

  // Keep onSave ref current
  onSaveRef.current = onSave;

  // Stable save function — reads all state at call time
  const save = useCallback(async () => {
    const { content, isDirty, setSaving, setLastSaved, markClean } =
      useEditorStore.getState();
    if (!isDirty) return;

    // Mark clean immediately to prevent concurrent duplicate saves
    markClean();
    setSaving(true);
    try {
      await onSaveRef.current(content);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Re-mark dirty so next change retries
      useEditorStore.getState().markDirty();
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounced auto-save on content change
  useEffect(() => {
    if (!enabled || !isDirty) return;

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
  }, [content, isDirty, enabled, delay, save]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (useEditorStore.getState().isDirty) {
        save();
      }
    };
  }, [save]);

  // Warn before tab close if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditorStore.getState().isDirty) {
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
    useEditorStore.getState().markClean();
  }, []);

  return {
    saveNow,
    discardChanges,
  };
}
