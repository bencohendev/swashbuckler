'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';

export function ParagraphElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      className="py-1"
    />
  );
}
