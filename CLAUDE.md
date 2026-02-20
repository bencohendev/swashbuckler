# Project Rules

## Code Style

- Use explicit imports instead of `React.X` syntax (e.g., `import { useState } from 'react'` not `React.useState`)
- Export inline with declaration, not at the bottom of the file (e.g., `export function Foo() {}`, `export const bar = ...`, `export type Baz = ...` — not `export { Foo, bar, Baz }`)
- Use PascalCase for React component files (e.g., `Button.tsx`, `UserProfile.tsx`)
- Avoid typecasting (`as`) when possible — prefer proper typing, type guards, or generics instead

## Task Management

- Update tasks as they are completed

## Documentation

### Structure
- Feature specs live in `.claude/docs/features/` with kebab-case names (e.g., `custom-themes.md`)
- Bug docs live in `.claude/docs/bugs/` — quick fixes go in `log.md`, complex bugs with root-cause analysis get individual files
- `.claude/docs/index.md` is the master index — update it when adding features or bugs
- `.claude/plans/` is for Claude Code plan mode working files only — no permanent docs

### Document-First Workflow
- Before implementing a new feature or non-trivial bug fix, create/update its spec in `.claude/docs/` and add it to `index.md`
- Small fixes (typos, one-line patches) are exempt — add a line to `bugs/log.md` if relevant
- Plan mode files in `.claude/plans/` are drafts. After approval, create the permanent spec in `.claude/docs/` and delete the plan file

### Maintaining Docs
- After completing implementation, update the relevant spec with surgical edits
- Read the existing doc before modifying it
- These docs are the source of truth for expected behavior
