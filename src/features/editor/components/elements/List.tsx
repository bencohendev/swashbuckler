'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';

export function BulletedListElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="ul"
      className="my-2 ml-6 list-disc"
    />
  );
}

export function NumberedListElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="ol"
      className="my-2 ml-6 list-decimal"
    />
  );
}

export function ListItemElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="li"
      className="py-0.5"
    />
  );
}
