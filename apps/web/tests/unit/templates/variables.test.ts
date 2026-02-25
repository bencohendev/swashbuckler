import { describe, it, expect } from 'vitest'
import type { Value } from '@udecode/plate'
import {
  resolveBuiltInVariable,
  extractContentVariables,
  extractPropertyVariables,
  resolveContentVariables,
  resolvePropertyVariables,
} from '@/features/templates/lib/variables'
import type { VariableResolutionContext } from '@/features/templates/lib/variables'
import {
  contentWithVariables,
  contentWithCustomVariables,
  contentWithText,
  emptyContent,
} from '../../fixtures/content'

const defaultContext: VariableResolutionContext = {
  userName: 'Alice',
  spaceName: 'My Space',
}

// Deeply nested content with a template variable inside nested children
const deeplyNestedContent: Value = [
  {
    type: 'blockquote',
    children: [
      {
        type: 'p',
        children: [
          { text: 'Nested ' },
          {
            type: 'bold',
            children: [
              { type: 'template_variable', variableName: 'user', children: [{ text: '' }] },
            ],
          },
        ],
      },
    ],
  },
]

describe('resolveBuiltInVariable', () => {
  it('returns a non-empty string for date', () => {
    const result = resolveBuiltInVariable('date', defaultContext)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('returns a non-empty string for time', () => {
    const result = resolveBuiltInVariable('time', defaultContext)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('returns a non-empty string for datetime', () => {
    const result = resolveBuiltInVariable('datetime', defaultContext)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('returns the userName when variable is user', () => {
    expect(resolveBuiltInVariable('user', defaultContext)).toBe('Alice')
  })

  it('returns Unknown when userName is null', () => {
    expect(resolveBuiltInVariable('user', { userName: null, spaceName: 'S' })).toBe('Unknown')
  })

  it('returns Default when spaceName is null', () => {
    expect(resolveBuiltInVariable('space', { userName: 'A', spaceName: null })).toBe('Default')
  })

  it('returns {{variableName}} for unknown variables', () => {
    expect(resolveBuiltInVariable('foobar', defaultContext)).toBe('{{foobar}}')
  })
})

describe('extractContentVariables', () => {
  it('returns empty arrays for empty content', () => {
    const result = extractContentVariables(emptyContent)
    expect(result.builtIn).toEqual([])
    expect(result.custom).toEqual([])
  })

  it('extracts user and date as builtIn from contentWithVariables', () => {
    const result = extractContentVariables(contentWithVariables)
    expect(result.builtIn).toContain('user')
    expect(result.builtIn).toContain('date')
    expect(result.custom).toEqual([])
  })

  it('extracts projectName as custom and user as builtIn from contentWithCustomVariables', () => {
    const result = extractContentVariables(contentWithCustomVariables)
    expect(result.builtIn).toContain('user')
    expect(result.custom).toContain('projectName')
  })

  it('deduplicates variable names', () => {
    const duplicateContent: Value = [
      {
        type: 'p',
        children: [
          { type: 'template_variable', variableName: 'user', children: [{ text: '' }] },
          { type: 'template_variable', variableName: 'user', children: [{ text: '' }] },
        ],
      },
    ]
    const result = extractContentVariables(duplicateContent)
    expect(result.builtIn).toEqual(['user'])
  })

  it('returns empty arrays for content with no variables', () => {
    const result = extractContentVariables(contentWithText)
    expect(result.builtIn).toEqual([])
    expect(result.custom).toEqual([])
  })

  it('finds deeply nested variables', () => {
    const result = extractContentVariables(deeplyNestedContent)
    expect(result.builtIn).toContain('user')
  })
})

describe('extractPropertyVariables', () => {
  it('returns empty arrays for empty object', () => {
    const result = extractPropertyVariables({})
    expect(result.builtIn).toEqual([])
    expect(result.custom).toEqual([])
  })

  it('extracts date as builtIn from property string', () => {
    const result = extractPropertyVariables({ title: '{{date}} report' })
    expect(result.builtIn).toContain('date')
    expect(result.custom).toEqual([])
  })

  it('extracts customField as custom from property string', () => {
    const result = extractPropertyVariables({ title: '{{customField}}' })
    expect(result.custom).toContain('customField')
    expect(result.builtIn).toEqual([])
  })

  it('skips non-string values', () => {
    const result = extractPropertyVariables({ count: 42, title: '{{date}}' })
    expect(result.builtIn).toEqual(['date'])
    expect(result.custom).toEqual([])
  })

  it('extracts multiple variables from the same string', () => {
    const result = extractPropertyVariables({ title: '{{date}} by {{user}}' })
    expect(result.builtIn).toContain('date')
    expect(result.builtIn).toContain('user')
  })
})

describe('resolveContentVariables', () => {
  it('replaces template_variable nodes with text nodes', () => {
    const resolved = resolveContentVariables(contentWithVariables, defaultContext, {})
    const paragraph = resolved[0] as Record<string, unknown>
    const children = paragraph.children as Array<Record<string, unknown>>
    // The template_variable nodes should be replaced with text nodes
    const textNodes = children.filter(c => 'text' in c && c.text !== '' && c.text !== ' on ' && c.text !== 'Created by ')
    expect(textNodes.length).toBeGreaterThan(0)
    for (const node of textNodes) {
      expect(node).not.toHaveProperty('type', 'template_variable')
      expect(node).toHaveProperty('text')
    }
  })

  it('resolves built-in user variable to provided userName', () => {
    const resolved = resolveContentVariables(contentWithVariables, defaultContext, {})
    const paragraph = resolved[0] as Record<string, unknown>
    const children = paragraph.children as Array<Record<string, unknown>>
    const userTextNode = children.find(c => c.text === 'Alice')
    expect(userTextNode).toBeDefined()
  })

  it('keeps {{name}} format for unresolved custom variables', () => {
    const resolved = resolveContentVariables(contentWithCustomVariables, defaultContext, {})
    const paragraph = resolved[0] as Record<string, unknown>
    const children = paragraph.children as Array<Record<string, unknown>>
    const unresolvedNode = children.find(c => c.text === '{{projectName}}')
    expect(unresolvedNode).toBeDefined()
  })

  it('resolves custom variable to provided value', () => {
    const resolved = resolveContentVariables(
      contentWithCustomVariables,
      defaultContext,
      { projectName: 'Swashbuckler' },
    )
    const paragraph = resolved[0] as Record<string, unknown>
    const children = paragraph.children as Array<Record<string, unknown>>
    const customNode = children.find(c => c.text === 'Swashbuckler')
    expect(customNode).toBeDefined()
  })
})

describe('resolvePropertyVariables', () => {
  it('replaces {{user}} in string values with userName', () => {
    const result = resolvePropertyVariables(
      { greeting: 'Hello {{user}}' },
      defaultContext,
      {},
    )
    expect(result.greeting).toBe('Hello Alice')
  })

  it('preserves non-string property values', () => {
    const result = resolvePropertyVariables(
      { count: 42, active: true, title: '{{user}}' },
      defaultContext,
      {},
    )
    expect(result.count).toBe(42)
    expect(result.active).toBe(true)
  })

  it('keeps original {{name}} for unresolved custom variables', () => {
    const result = resolvePropertyVariables(
      { title: '{{customField}}' },
      defaultContext,
      {},
    )
    expect(result.title).toBe('{{customField}}')
  })

  it('resolves custom variable to provided value', () => {
    const result = resolvePropertyVariables(
      { title: '{{projectName}} docs' },
      defaultContext,
      { projectName: 'Swashbuckler' },
    )
    expect(result.title).toBe('Swashbuckler docs')
  })
})
