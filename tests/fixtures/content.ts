import type { Value } from '@udecode/plate'

// Plate content with mention nodes pointing to objects
export const contentWithMentions: Value = [
  {
    type: 'p',
    children: [
      { text: 'Check out ' },
      { type: 'mention', objectId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', children: [{ text: '' }] },
      { text: ' and ' },
      { type: 'mention', objectId: 'b2c3d4e5-f6a7-4890-bcde-f01234567890', children: [{ text: '' }] },
    ],
  },
]

// Content with duplicate mention IDs (should deduplicate)
export const contentWithDuplicateMentions: Value = [
  {
    type: 'p',
    children: [
      { type: 'mention', objectId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', children: [{ text: '' }] },
    ],
  },
  {
    type: 'p',
    children: [
      { type: 'mention', objectId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', children: [{ text: '' }] },
    ],
  },
]

// Content with template_variable nodes
export const contentWithVariables: Value = [
  {
    type: 'p',
    children: [
      { text: 'Created by ' },
      { type: 'template_variable', variableName: 'user', children: [{ text: '' }] },
      { text: ' on ' },
      { type: 'template_variable', variableName: 'date', children: [{ text: '' }] },
    ],
  },
]

// Content with custom variables
export const contentWithCustomVariables: Value = [
  {
    type: 'p',
    children: [
      { type: 'template_variable', variableName: 'projectName', children: [{ text: '' }] },
      { text: ' - ' },
      { type: 'template_variable', variableName: 'user', children: [{ text: '' }] },
    ],
  },
]

// Content with plain text only
export const contentWithText: Value = [
  {
    type: 'p',
    children: [{ text: 'Hello world' }],
  },
  {
    type: 'p',
    children: [{ text: 'Second paragraph' }],
  },
]

// Empty content
export const emptyContent: Value = []

// Nested content with children arrays
export const nestedContent: Value = [
  {
    type: 'blockquote',
    children: [
      {
        type: 'p',
        children: [
          { text: 'Nested ' },
          { type: 'mention', objectId: 'c3d4e5f6-a7b8-4901-cdef-012345678901', children: [{ text: '' }] },
          {
            type: 'bold',
            children: [{ text: 'deep text' }],
          },
        ],
      },
    ],
  },
]
