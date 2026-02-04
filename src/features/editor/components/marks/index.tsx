'use client';

import type { PlateLeafProps } from '@udecode/plate/react';
import { PlateLeaf } from '@udecode/plate/react';

export function BoldMark(props: PlateLeafProps) {
  return <PlateLeaf {...props} as="strong" className="font-bold" />;
}

export function ItalicMark(props: PlateLeafProps) {
  return <PlateLeaf {...props} as="em" className="italic" />;
}

export function UnderlineMark(props: PlateLeafProps) {
  return <PlateLeaf {...props} as="u" className="underline" />;
}

export function StrikethroughMark(props: PlateLeafProps) {
  return <PlateLeaf {...props} as="s" className="line-through" />;
}

export function CodeMark(props: PlateLeafProps) {
  return (
    <PlateLeaf
      {...props}
      as="code"
      className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm dark:bg-gray-800"
    />
  );
}
