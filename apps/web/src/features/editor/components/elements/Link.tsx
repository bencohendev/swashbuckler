'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';
import { isSafeUrl } from '@/shared/lib/url';

function getUrl(element: Record<string, unknown>): string | undefined {
  if (typeof element.url !== 'string') return undefined;
  return isSafeUrl(element.url) ? element.url : undefined;
}

export function LinkElement({ element, children, ...props }: PlateElementProps) {
  const url = getUrl(element);

  return (
    <PlateElement
      {...props}
      element={element}
      className="inline"
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        {children}
      </a>
    </PlateElement>
  );
}
