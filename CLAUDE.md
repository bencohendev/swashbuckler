# Project Rules

## Code Style

- Use explicit imports instead of `React.X` syntax (e.g., `import { useState } from 'react'` not `React.useState`)
- Export inline with declaration, not at the bottom of the file (e.g., `export function Foo() {}`, `export const bar = ...`, `export type Baz = ...` — not `export { Foo, bar, Baz }`)
- Use PascalCase for React component files (e.g., `Button.tsx`, `UserProfile.tsx`)
- Avoid typecasting (`as`) when possible — prefer proper typing, type guards, or generics instead

## Task Management

- Update tasks as they are completed

## Feature Specs

- All feature specs live in `.claude/plans/` with descriptive names (e.g., `custom-themes.md`, not random/auto-generated names). When plan mode assigns a random filename, override it with a contextual name.
- When planning a new feature, create its spec in `.claude/plans/` and add it to `.claude/plans/index.md` before starting implementation.
- After completing any implementation that adds, changes, or removes features, update the relevant feature spec. Read the existing doc first, then make surgical edits to reflect what changed.
- These docs are the source of truth for expected behavior — keep them accurate.
