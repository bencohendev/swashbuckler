import { createPlatePlugin } from '@udecode/plate/react'

export const TemplateVariablePlugin = createPlatePlugin({
  key: 'template_variable',
  node: {
    isElement: true,
    isInline: true,
    isVoid: true,
  },
})
