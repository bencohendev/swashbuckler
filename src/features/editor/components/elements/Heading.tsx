'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';

export function H1Element(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="h1"
      className="mt-8 mb-4 text-4xl font-bold"
    />
  );
}

export function H2Element(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="h2"
      className="mt-6 mb-3 text-3xl font-semibold"
    />
  );
}

export function H3Element(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="h3"
      className="mt-4 mb-2 text-2xl font-medium"
    />
  );
}
