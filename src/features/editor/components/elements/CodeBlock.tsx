'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';

export function CodeBlockElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="pre"
      className="my-4 overflow-x-auto rounded-lg bg-gray-900 p-4 font-mono text-sm text-gray-100"
    />
  );
}

export function CodeLineElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="div"
      className="leading-relaxed"
    />
  );
}
