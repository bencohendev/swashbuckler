'use client';

import { useState } from 'react';
import { createPlatePlugin } from '@udecode/plate/react';
import type { PlateLeafProps } from '@udecode/plate/react';
import { PlateLeaf } from '@udecode/plate/react';

// Spoiler mark component - click to reveal hidden text
export function SpoilerMark({ children, ...props }: PlateLeafProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <PlateLeaf {...props} as="span" className="inline">
      <span
        onClick={() => setRevealed(true)}
        className={
          revealed
            ? 'bg-gray-200 px-0.5 dark:bg-gray-700'
            : 'cursor-pointer bg-gray-900 px-0.5 text-transparent selection:bg-gray-900 dark:bg-gray-100'
        }
      >
        {children}
      </span>
    </PlateLeaf>
  );
}

// Spoiler plugin definition
export const SpoilerPlugin = createPlatePlugin({
  key: 'spoiler',
  node: {
    isLeaf: true,
    component: SpoilerMark,
  },
});
