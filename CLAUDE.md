# Project Rules

## Code Style

- Use explicit imports instead of `React.X` syntax (e.g., `import { useState } from 'react'` not `React.useState`)
- Export inline with declaration, not at the bottom of the file (e.g., `export function Foo() {}`, `export const bar = ...`, `export type Baz = ...` — not `export { Foo, bar, Baz }`)
- Use PascalCase for React component files (e.g., `Button.tsx`, `UserProfile.tsx`)
- Avoid typecasting (`as`) when possible — prefer proper typing, type guards, or generics instead

## Accessibility

- All features and bug fixes must follow accessibility best practices: semantic HTML, ARIA attributes, keyboard navigation, focus management, and sufficient color contrast
- Accessibility is not a separate concern — it's part of every feature and fix

## Testing & Verification

After adding, modifying, or fixing features, run these checks:
- **Tests:** `npx vitest run` — don't let existing tests break; update them to match code changes
- **Types:** `npx tsc --noEmit` — all code must pass typecheck with no errors
- **Lint:** `npm run lint` — don't introduce new lint errors (pre-existing warnings are tracked separately)

### Test conventions
- Test fixtures live in `tests/fixtures/` — keep them in sync with current schemas
- Zod 4 requires RFC4122-compliant UUIDs in tests (no synthetic `00000000-...` IDs)

## Branching & Worktrees

- **BEFORE any Edit or Write call**, verify you are in a worktree — if not, call `EnterWorktree` first
- This applies in all contexts: starting a task, exiting plan mode, resuming work — no exceptions
- Never commit directly on `dev`, `main`, or other environment branches
- Use a descriptive branch name (e.g., `worktree-add-toast-notifications`)
- Merge the worktree branch back into the target branch only when work is complete and verified

## Task Management

- Update tasks as they are completed

## Documentation

### Structure
- Feature specs live in `.readme/features/` with kebab-case names (e.g., `custom-themes.md`)
- Bug tracking lives in `.readme/bugs/log.md` — all bugs get a row there; complex bugs with root-cause analysis also get individual files in the same directory, linked from the log
- `.readme/index.md` is the master index — update it when adding features
- `.claude/plans/` is for Claude Code plan mode working files only — no permanent docs

### Document-First Workflow
- Before implementing a new feature or non-trivial bug fix, create/update its spec in `.readme/`
- New features get added to `index.md`; bugs get added to `bugs/log.md`
- Small fixes (typos, one-line patches) are exempt — add a line to `bugs/log.md` if relevant
- Plan mode files in `.claude/plans/` are drafts. After approval, create the permanent spec in `.readme/` and delete the plan file

### Feature Status
- Each spec has a `**Status:**` line at the top: `Done`, `Active`, or `Not started`
- When new work is planned for an implemented feature, set its status to `Active` and document the new scope
- When the new scope ships, set it back to `Done`
- To find features with open work: `grep -l "Status.*Active" .readme/features/`

### Maintaining Docs
- After completing implementation, update the relevant spec with surgical edits
- Read the existing doc before modifying it
- These docs are the source of truth for expected behavior
