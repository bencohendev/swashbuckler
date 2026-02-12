# Project Rules

## Code Style

- Use explicit imports instead of `React.X` syntax (e.g., `import { useState } from 'react'` not `React.useState`)
- Export inline with declaration, not at the bottom of the file (e.g., `export function Foo() {}`, `export const bar = ...`, `export type Baz = ...` — not `export { Foo, bar, Baz }`)
- Use PascalCase for React component files (e.g., `Button.tsx`, `UserProfile.tsx`)
- Avoid typecasting (`as`) when possible — prefer proper typing, type guards, or generics instead

## Task Management

- Update tasks as they are completed

## Feature Specs

- After completing any implementation that adds, changes, or removes features, update the relevant feature spec in `.claude/plans/`. Read the existing doc first, then make surgical edits to reflect what changed.
- If no spec exists for a substantial new feature, create one and add it to `.claude/plans/index.md`.
- These docs are the source of truth for expected behavior — keep them accurate.
