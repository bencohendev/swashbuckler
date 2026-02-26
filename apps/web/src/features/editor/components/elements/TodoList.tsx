'use client'

import type { PlateElementProps } from '@udecode/plate/react'
import { PlateElement, useReadOnly } from '@udecode/plate/react'
import { useEditorRef } from '@udecode/plate/react'

export function TodoListElement({ children, element, ...props }: PlateElementProps) {
  const editor = useEditorRef()
  const readOnly = useReadOnly()
  const checked = !!(element as { checked?: boolean }).checked

  return (
    <PlateElement {...props} element={element} className="flex items-start gap-2 py-0.5">
      <span contentEditable={false} className="flex items-center pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            if (readOnly) return
            editor.tf.setNodes(
              { checked: e.target.checked },
              { at: element }
            )
          }}
          aria-label="Task complete"
          className="size-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-offset-gray-900"
        />
      </span>
      <span className={checked ? 'flex-1 line-through opacity-60' : 'flex-1'}>
        {children}
      </span>
    </PlateElement>
  )
}
