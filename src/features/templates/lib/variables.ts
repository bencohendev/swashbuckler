import type { Value } from '@udecode/plate'

export interface BuiltInVariable {
  name: string
  label: string
  description: string
}

export const BUILT_IN_VARIABLES: BuiltInVariable[] = [
  { name: 'date', label: 'Date', description: 'Current date' },
  { name: 'time', label: 'Time', description: 'Current time' },
  { name: 'datetime', label: 'Date & Time', description: 'Current date and time' },
  { name: 'user', label: 'User', description: 'Current user name' },
  { name: 'space', label: 'Space', description: 'Current space name' },
]

const BUILT_IN_NAMES = new Set(BUILT_IN_VARIABLES.map(v => v.name))

export interface VariableResolutionContext {
  userName: string | null
  spaceName: string | null
}

export function resolveBuiltInVariable(name: string, context: VariableResolutionContext): string {
  const now = new Date()
  switch (name) {
    case 'date':
      return now.toLocaleDateString()
    case 'time':
      return now.toLocaleTimeString()
    case 'datetime':
      return now.toLocaleString()
    case 'user':
      return context.userName ?? 'Unknown'
    case 'space':
      return context.spaceName ?? 'Default'
    default:
      return `{{${name}}}`
  }
}

interface ExtractedVariables {
  builtIn: string[]
  custom: string[]
}

export function extractContentVariables(content: Value): ExtractedVariables {
  const builtIn = new Set<string>()
  const custom = new Set<string>()

  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) continue

      const n = node as Record<string, unknown>

      if (n.type === 'template_variable' && typeof n.variableName === 'string') {
        if (BUILT_IN_NAMES.has(n.variableName)) {
          builtIn.add(n.variableName)
        } else {
          custom.add(n.variableName)
        }
      }

      if (Array.isArray(n.children)) {
        walk(n.children)
      }
    }
  }

  walk(content)
  return { builtIn: [...builtIn], custom: [...custom] }
}

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g

export function extractPropertyVariables(properties: Record<string, unknown>): ExtractedVariables {
  const builtIn = new Set<string>()
  const custom = new Set<string>()

  for (const value of Object.values(properties)) {
    if (typeof value !== 'string') continue

    for (const match of value.matchAll(VARIABLE_PATTERN)) {
      const name = match[1]
      if (BUILT_IN_NAMES.has(name)) {
        builtIn.add(name)
      } else {
        custom.add(name)
      }
    }
  }

  return { builtIn: [...builtIn], custom: [...custom] }
}

export function resolveContentVariables(
  content: Value,
  context: VariableResolutionContext,
  customValues: Record<string, string>
): Value {
  const cloned: Value = JSON.parse(JSON.stringify(content))

  function walk(nodes: unknown[]): unknown[] {
    const result: unknown[] = []
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null) {
        result.push(node)
        continue
      }

      const n = node as Record<string, unknown>

      if (n.type === 'template_variable' && typeof n.variableName === 'string') {
        const name = n.variableName
        let resolved: string
        if (BUILT_IN_NAMES.has(name)) {
          resolved = resolveBuiltInVariable(name, context)
        } else {
          resolved = customValues[name] ?? `{{${name}}}`
        }
        result.push({ text: resolved })
        continue
      }

      if (Array.isArray(n.children)) {
        result.push({ ...n, children: walk(n.children) })
      } else {
        result.push(n)
      }
    }
    return result
  }

  return walk(cloned) as Value
}

export function resolvePropertyVariables(
  properties: Record<string, unknown>,
  context: VariableResolutionContext,
  customValues: Record<string, string>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value !== 'string') {
      resolved[key] = value
      continue
    }

    resolved[key] = value.replace(VARIABLE_PATTERN, (match, name: string) => {
      if (BUILT_IN_NAMES.has(name)) {
        return resolveBuiltInVariable(name, context)
      }
      return customValues[name] ?? match
    })
  }

  return resolved
}
