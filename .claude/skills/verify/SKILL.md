---
name: verify
description: Run all verification checks (typecheck, lint, unit tests, e2e tests) and audit documentation for the most recent feature. Use after completing feature work or to check project health.
user_invocable: true
---

## Instructions

Run all verification checks and audit documentation completeness for the most recently worked-on feature.

### Steps

1. **Identify the most recent feature** — Read `.readme/index.md` and grep `.readme/features/` for `Status.*Active` or look at recent git history to find the most recently completed/active feature. Read the spec to understand what was changed.

2. **TypeScript typecheck** — Run `cd apps/web && npx tsc --noEmit`. Report pass/fail. If there are errors, list them.

3. **Lint** — Run `npm run lint` from the repo root. Report pass/fail. If there are errors, list them (ignore pre-existing warnings).

4. **Unit tests** — Run `cd apps/web && npx vitest run`. Report pass/fail. If there are failures, list the failing tests.

5. **E2e tests** — Run `cd apps/web && npx playwright test`. Report pass/fail. If there are failures, list the failing tests.

6. **Documentation audit** — Check that all documentation is up to date for the feature:

   a. **Feature spec** (`.readme/features/`) — Read the spec. Confirm it reflects the actual implementation: correct file paths, accurate decisions, verification checklist checked off, and status set appropriately (`Done` if finished, `Active` if still in progress).

   b. **User-facing docs** (`apps/docs/content/docs/`) — Check if the feature affects user-visible behavior. If so, confirm there is a corresponding docs page that accurately describes the current behavior. If no page exists and one is needed, flag it. If a page exists but is outdated, flag the specific gaps.

   c. **Master index** (`.readme/index.md`) — Confirm the feature is in the correct table (Implemented vs Planned) and the spec link is present.

7. **Fix issues** — If any check failed or documentation gaps were found:
   - Enter a worktree if code or doc fixes are needed
   - Fix the issues
   - Re-run failing checks to confirm they pass
   - Merge fixes back

### Output Format

```
## Verification Results

| Check       | Result | Details          |
|-------------|--------|------------------|
| TypeScript  | Pass   |                  |
| Lint        | Pass   |                  |
| Unit Tests  | Pass   | 42 tests passed  |
| E2e Tests   | Pass   | 15 tests passed  |

## Feature: <name>

### Documentation Audit
- **Feature spec:** Up to date / <specific gaps>
- **User docs:** Up to date / Missing page / <specific gaps>
- **Index:** Correct / <issue>

### Issues Found
- Description of each issue and fix applied

### Status
All checks passing, docs up to date / N issues remain
```

If everything passes on the first run, keep the output short — just the table, doc audit, and a confirmation.
