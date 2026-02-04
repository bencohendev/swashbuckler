'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';

function getImageProps(element: Record<string, unknown>) {
  return {
    url: typeof element.url === 'string' ? element.url : undefined,
    alt: typeof element.alt === 'string' ? element.alt : undefined,
    width: typeof element.width === 'number' ? element.width : undefined,
  };
}

export function ImageElement({ element, children, ...props }: PlateElementProps) {
  const { url, alt, width } = getImageProps(element);

  return (
    <PlateElement {...props} element={element} className="my-4">
      <div contentEditable={false}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt || ''}
            style={{ width: width ? `${width}px` : 'auto', maxWidth: '100%' }}
            className="rounded-lg"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
            <span className="text-gray-400">Image placeholder</span>
          </div>
        )}
      </div>
      {children}
    </PlateElement>
  );
}
