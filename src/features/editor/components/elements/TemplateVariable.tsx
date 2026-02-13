'use client'

import type { PlateElementProps } from '@udecode/plate/react'
import { PlateElement } from '@udecode/plate/react'

function getVariableProps(element: Record<string, unknown>) {
  return {
    variableName: typeof element.variableName === 'string' ? element.variableName : 'unknown',
    variableType: typeof element.variableType === 'string' ? element.variableType : 'custom',
  }
}

export function TemplateVariableElement({ element, children, ...props }: PlateElementProps) {
  const { variableName, variableType } = getVariableProps(element)

  return (
    <PlateElement {...props} element={element} as="span" className="inline">
      <span
        contentEditable={false}
        className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-sm font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      >
        {variableType === 'builtin' ? `{{${variableName}}}` : `{{${variableName}}}`}
      </span>
      {children}
    </PlateElement>
  )
}
