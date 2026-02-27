'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export const MIN_WIDTH = 50;
const KEYBOARD_STEP = 10;
const KEYBOARD_STEP_LARGE = 50;

interface ResizeState {
  isResizing: boolean;
  previewWidth: number | null;
}

interface UseImageResizeOptions {
  /** Current persisted width (undefined = natural size) */
  width: number | undefined;
  /** Callback to persist the new width */
  onResize: (width: number) => void;
  /** Whether resize is disabled (read-only mode) */
  disabled?: boolean;
}

export function useImageResize({ width, onResize, disabled }: UseImageResizeOptions) {
  const [state, setState] = useState<ResizeState>({ isResizing: false, previewWidth: null });
  const imgRef = useRef<HTMLImageElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const aspectRatioRef = useRef(1);
  const containerWidthRef = useRef(0);
  const handleSideRef = useRef<'left' | 'right'>('right');
  const previewWidthRef = useRef(0);
  const keyboardResizingRef = useRef(false);

  const measureContainerWidth = useCallback(() => {
    const img = imgRef.current;
    if (!img) return 800;
    const container = img.closest('[data-image-container]');
    const measureEl = container?.parentElement ?? img.parentElement;
    return measureEl?.clientWidth ?? 800;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, side: 'left' | 'right') => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      const img = imgRef.current;
      if (!img) return;

      containerWidthRef.current = measureContainerWidth();

      startXRef.current = e.clientX;
      startWidthRef.current = img.clientWidth;
      aspectRatioRef.current = img.naturalWidth / img.naturalHeight || 1;
      handleSideRef.current = side;

      previewWidthRef.current = img.clientWidth;
      setState({ isResizing: true, previewWidth: img.clientWidth });

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, measureContainerWidth],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!state.isResizing) return;

      const direction = handleSideRef.current === 'right' ? 1 : -1;
      const delta = (e.clientX - startXRef.current) * direction;
      const maxWidth = containerWidthRef.current;
      const newWidth = Math.round(
        Math.max(MIN_WIDTH, Math.min(maxWidth, startWidthRef.current + delta)),
      );

      previewWidthRef.current = newWidth;
      setState((prev) => ({ ...prev, previewWidth: newWidth }));
    },
    [state.isResizing],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!state.isResizing) return;

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const finalWidth = previewWidthRef.current;
      setState({ isResizing: false, previewWidth: null });

      if (finalWidth != null && finalWidth !== width) {
        onResize(finalWidth);
      }
    },
    [state.isResizing, width, onResize],
  );

  // Keyboard resize: Arrow keys adjust preview, Enter commits, Escape cancels
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, side: 'left' | 'right') => {
      if (disabled) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
        // ArrowRight on right handle = grow, ArrowLeft = shrink (mirrored for left)
        const direction = side === 'right'
          ? (e.key === 'ArrowRight' ? 1 : -1)
          : (e.key === 'ArrowLeft' ? 1 : -1);

        const maxWidth = measureContainerWidth();
        const currentWidth = state.previewWidth ?? width ?? imgRef.current?.clientWidth ?? 300;
        const newWidth = Math.round(
          Math.max(MIN_WIDTH, Math.min(maxWidth, currentWidth + step * direction)),
        );

        if (!keyboardResizingRef.current) {
          keyboardResizingRef.current = true;
          setState({ isResizing: true, previewWidth: newWidth });
        } else {
          setState((prev) => ({ ...prev, previewWidth: newWidth }));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (keyboardResizingRef.current && state.previewWidth != null) {
          const finalWidth = state.previewWidth;
          keyboardResizingRef.current = false;
          setState({ isResizing: false, previewWidth: null });
          if (finalWidth !== width) {
            onResize(finalWidth);
          }
        }
      } else if (e.key === 'Escape') {
        if (keyboardResizingRef.current) {
          e.preventDefault();
          keyboardResizingRef.current = false;
          setState({ isResizing: false, previewWidth: null });
        }
      }
    },
    [disabled, state.previewWidth, width, onResize, measureContainerWidth],
  );

  // Commit keyboard resize on blur (same as Enter)
  const handleBlur = useCallback(() => {
    if (keyboardResizingRef.current && state.previewWidth != null) {
      const finalWidth = state.previewWidth;
      keyboardResizingRef.current = false;
      setState({ isResizing: false, previewWidth: null });
      if (finalWidth !== width) {
        onResize(finalWidth);
      }
    }
  }, [state.previewWidth, width, onResize]);

  // Cancel pointer resize on Escape
  useEffect(() => {
    if (!state.isResizing || keyboardResizingRef.current) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState({ isResizing: false, previewWidth: null });
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [state.isResizing]);

  const displayWidth = state.previewWidth ?? width;

  return {
    imgRef,
    isResizing: state.isResizing,
    displayWidth,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleKeyDown,
    handleBlur,
  };
}
