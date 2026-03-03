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
- **Unit tests:** `cd apps/web && npx vitest run` — don't let existing tests break; update them to match code changes
- **E2e tests:** `cd apps/web && npx playwright test` — required for user-facing changes; run the full suite to catch regressions
- **Types:** `cd apps/web && npx tsc --noEmit` — all code must pass typecheck with no errors
- **Lint:** `npm run lint` (from repo root) — don't introduce new lint errors (pre-existing warnings are tracked separately)

### Test conventions
- Unit test files live alongside source or in `apps/web/tests/` — colocate with the code they test
- E2e test files live in `apps/web/tests/e2e/` — use Playwright, tests run against `http://localhost:3000`
- Test fixtures live in `apps/web/tests/fixtures/` — keep them in sync with current schemas
- Zod 4 requires RFC4122-compliant UUIDs in tests (no synthetic `00000000-...` IDs)

## Branching & Worktrees

- **BEFORE any Edit or Write call**, verify you are in a worktree — if not, call `EnterWorktree` first
- This applies in all contexts: starting a task, exiting plan mode, resuming work — no exceptions
- Never commit directly on `dev`, `main`, or other environment branches
- Use a descriptive branch name (e.g., `worktree-add-toast-notifications`)
- Merge the worktree branch back into the target branch only when work is complete and verified
- **Merging from a worktree:** You cannot check out branches that are already checked out in another worktree. To merge, `cd` to the main repo root (`/Users/bencohen/dev/personal/swashbuckler`), then run `git checkout <target-branch> && git pull origin <target-branch> && git merge <worktree-branch> --no-edit`. Default target is `dev` unless told otherwise.

## Task Management

- Update tasks as they are completed

## Feature Workflow

This is the required workflow for all feature work. **Do not skip steps.**

### 1. Pick Work
- Use `/find-work` to surface available items (Active features, Not started specs, planned ideas, open bugs)
- User selects what to work on

### 2. Mark as Active
- Set the feature spec's `**Status:**` to `Active` (create the spec first if it doesn't exist — see step 3)
- If the feature is in the Planned table in `index.md` without a spec link, it stays there until a spec is created
- Commit the status change and merge to `dev` **before starting implementation**

### 3. Ensure a Spec Exists
- **If a spec exists:** read it, confirm scope with the user, then begin implementation
- **If no spec exists:** write the spec in `.readme/features/` first, add it to `index.md`, get user approval, then begin
- Plan mode files in `.claude/plans/` are scratch — after approval, the permanent spec must be in `.readme/features/` and the plan file deleted

### 4. Implement
- Enter a worktree, implement, and verify (see Testing & Verification below)
- **Unit tests:** add or update unit tests for new/changed logic — all features and bug fixes must have corresponding unit test coverage
- **E2e tests:** required for user-facing changes — add Playwright tests in `apps/web/tests/e2e/` that cover the key user flows affected by the change; internal refactors without visible behavior changes can skip e2e
- Run all checks (unit tests, e2e tests, types, lint) before finishing

### 5. Finish
- **Update the spec** in `.readme/features/` with any implementation details or changes from the original plan
- **Update user-facing docs** in `apps/docs/content/docs/` — required for any change that affects user-visible behavior; create a new page if needed (see User-Facing Documentation below)
- Set `**Status:**` to `Done`
- Move the feature from the Planned table to the Implemented table in `index.md` (if it was planned)
- Commit doc updates and merge to `dev`

## Documentation

### Structure
- Feature specs live in `.readme/features/` with kebab-case names (e.g., `custom-themes.md`)
- Bug tracking lives in `.readme/bugs/log.md` — all bugs get a row there; complex bugs with root-cause analysis also get individual files in the same directory, linked from the log
- `.readme/index.md` is the master index — update it when adding or completing features
- `.claude/plans/` is for Claude Code plan mode working files only — no permanent docs

### Feature Status
- Each spec has a `**Status:**` line at the top: `Done`, `Active`, or `Not started`
- `Active` = work is in progress; `Done` = shipped; `Not started` = specced but not built
- When new work is planned for a Done feature, set its status to `Active` and document the new scope

### Maintaining Docs
- After completing implementation, update the relevant spec with surgical edits
- Read the existing doc before modifying it
- These docs are the source of truth for expected behavior

### User-Facing Documentation
- User docs live in `apps/docs/content/docs/` as MDX files
- When a feature is added, changed, or removed, update the corresponding docs page to match
- New features that don't fit an existing page need a new MDX file and an entry in `meta.json`
- Screenshot placeholders use `{/* screenshot: description */}` (MDX comments)
- Escape bare curly braces in prose with backslashes (`\{...\}`) — MDX parses them as JSX expressions
