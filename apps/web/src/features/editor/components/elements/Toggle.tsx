'use client';

import { useState } from 'react';
import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export function ToggleElement({ children, ...props }: PlateElementProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <PlateElement {...props} className="my-2">
      <div className="flex items-start">
        <button
          type="button"
          contentEditable={false}
          onClick={() => setIsOpen(!isOpen)}
          className="mr-1 mt-1 flex h-5 w-5 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1">
          <div className={isOpen ? undefined : 'hidden'}>{children}</div>
          {!isOpen && (
            <div contentEditable={false} className="text-gray-400">
              ...
            </div>
          )}
        </div>
      </div>
    </PlateElement>
  );
}
