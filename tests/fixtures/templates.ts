import type { Template, CreateTemplateInput } from '@/shared/lib/data'

export const LOCAL_DEFAULT_SPACE_ID = '99b075ae-465d-4843-a324-cc3d48a80d6e'
export const PAGE_TYPE_ID = '7a9e3a69-dbcb-466d-8a5c-391ca99b9ba4'

export function createMockTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: crypto.randomUUID(),
    name: 'Test Template',
    type_id: PAGE_TYPE_ID,
    owner_id: null,
    space_id: LOCAL_DEFAULT_SPACE_ID,
    icon: null,
    cover_image: null,
    properties: {},
    content: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Template
}

export function createTemplateInput(overrides: Partial<CreateTemplateInput> = {}): CreateTemplateInput {
  return {
    name: 'Meeting Notes Template',
    type_id: PAGE_TYPE_ID,
    ...overrides,
  }
}

export const templateWithVariables = createMockTemplate({
  content: [
    {
      type: 'p',
      children: [
        { text: 'Created by ' },
        { type: 'template_variable', variableName: 'user', children: [{ text: '' }] },
      ],
    },
  ],
  properties: { author: '{{user}}', date: '{{date}}' },
})
