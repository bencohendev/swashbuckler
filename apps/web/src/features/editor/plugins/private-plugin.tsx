'use client';

import { useContext } from 'react';
import { createPlatePlugin } from '@udecode/plate/react';
import type { PlateElementProps, PlateLeafProps } from '@udecode/plate/react';
import { PlateElement, PlateLeaf } from '@udecode/plate/react';
import { EyeOff } from 'lucide-react';
import { EditorModeContext } from '../components/Editor';

// Private block element — container visible only to owner
export function PrivateBlockElement({ children, element, ...props }: PlateElementProps) {
  const { isOwner } = useContext(EditorModeContext);

  if (!isOwner) {
    return (
      <PlateElement {...props} element={element} className="hidden">
        <div contentEditable={false}>{children}</div>
      </PlateElement>
    );
  }

  return (
    <PlateElement
      {...props}
      element={element}
      className="my-4 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50/50 p-4 dark:border-purple-700 dark:bg-purple-950/30"
    >
      <span contentEditable={false} className="mb-2 flex items-center gap-1.5 text-xs font-medium text-purple-500 dark:text-purple-400">
        <EyeOff className="size-3.5" />
        Private
      </span>
      <div className="flex-1">{children}</div>
    </PlateElement>
  );
}

// Private inline mark — text visible only to owner
export function PrivateMark({ children, ...props }: PlateLeafProps) {
  const { isOwner } = useContext(EditorModeContext);

  if (!isOwner) {
    return (
      <PlateLeaf {...props} as="span" className="hidden">
        <span contentEditable={false}>{children}</span>
      </PlateLeaf>
    );
  }

  return (
    <PlateLeaf
      {...props}
      as="span"
      className="border border-dashed border-purple-300 bg-purple-50 px-0.5 dark:border-purple-700 dark:bg-purple-950/50"
    >
      {children}
    </PlateLeaf>
  );
}

// Private block plugin
export const PrivateBlockPlugin = createPlatePlugin({
  key: 'private_block',
  node: {
    isElement: true,
    component: PrivateBlockElement,
  },
});

// Private inline mark plugin
export const PrivateMarkPlugin = createPlatePlugin({
  key: 'private',
  node: {
    isLeaf: true,
    component: PrivateMark,
  },
  handlers: {
    onKeyDown: ({ editor, event }) => {
      if (event.metaKey && event.shiftKey && event.key === 'p') {
        event.preventDefault();
        editor.tf.toggleMark('private');
      }
    },
  },
});
