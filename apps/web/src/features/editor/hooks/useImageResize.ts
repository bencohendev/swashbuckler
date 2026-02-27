'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

const MIN_WIDTH = 50;

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, side: 'left' | 'right') => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      const img = imgRef.current;
      if (!img) return;

      // Measure the container's parent (block-level) rather than the
      // inline-block container itself — the container shrinks to fit the
      // image, which would prevent resizing back up after shrinking.
      const container = img.closest('[data-image-container]');
      const measureEl = container?.parentElement ?? img.parentElement;
      containerWidthRef.current = measureEl?.clientWidth ?? 800;

      startXRef.current = e.clientX;
      startWidthRef.current = img.clientWidth;
      aspectRatioRef.current = img.naturalWidth / img.naturalHeight || 1;
      handleSideRef.current = side;

      previewWidthRef.current = img.clientWidth;
      setState({ isResizing: true, previewWidth: img.clientWidth });

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled],
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

  // Cancel resize on Escape
  useEffect(() => {
    if (!state.isResizing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setState({ isResizing: false, previewWidth: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isResizing]);

  const displayWidth = state.previewWidth ?? width;

  return {
    imgRef,
    isResizing: state.isResizing,
    displayWidth,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
