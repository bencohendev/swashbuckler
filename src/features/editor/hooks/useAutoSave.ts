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
  const { content, isDirty, setSaving, setLastSaved, markClean } = useEditorStore();

  const save = useCallback(async () => {
    if (!isDirty) return;

    setSaving(true);
    try {
      await onSave(content);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Keep dirty state so next change will retry
    } finally {
      setSaving(false);
    }
  }, [content, isDirty, onSave, setSaving, setLastSaved]);

  // Debounced auto-save on content change
  useEffect(() => {
    if (!enabled || !isDirty) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, isDirty, enabled, delay, save]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirty) {
        save();
      }
    };
  }, [isDirty, save]);

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
    markClean();
  }, [markClean]);

  return {
    saveNow,
    discardChanges,
  };
}
