'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';
import Link from 'next/link';

function getMentionProps(element: Record<string, unknown>) {
  return {
    objectId: typeof element.objectId === 'string' ? element.objectId : undefined,
    objectTitle: typeof element.objectTitle === 'string' ? element.objectTitle : undefined,
  };
}

export function MentionElement({ element, children, ...props }: PlateElementProps) {
  const { objectId, objectTitle } = getMentionProps(element);

  if (!objectId) {
    return (
      <PlateElement {...props} element={element} className="inline">
        {children}
      </PlateElement>
    );
  }

  return (
    <PlateElement {...props} element={element} className="inline">
      <Link
        href={`/objects/${objectId}`}
        contentEditable={false}
        className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        {objectTitle || 'Untitled'}
      </Link>
      {children}
    </PlateElement>
  );
}

export function MentionInputElement({ children, ...props }: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="span"
      className="inline rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    >
      {children}
    </PlateElement>
  );
}
