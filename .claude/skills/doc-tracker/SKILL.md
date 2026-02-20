---
name: doc-tracker
description: Format and structure guidelines for feature specs and bug docs in .claude/docs/. Use when creating or updating documentation.
---

## Documentation Structure

All documentation lives in `.claude/docs/`:
- **`index.md`** — master index with feature table, bug table, and unfinished features
- **`features/`** — one file per feature (planned or complete)
- **`bugs/`** — `log.md` for quick fixes, individual files for complex bugs
- **`v1-archive.md`** — historical v1 plan (reference only)

## Feature Spec Format

Feature specs are stored in `.claude/docs/features/` as separate per-feature markdown documents.

### File Naming

- Use kebab-case slugs (e.g., `quick-capture.md`, `type-pages.md`)
- Add new files to the Feature Plans table in `index.md`

### Document Structure

Each spec should include:

1. **Title + Status** — feature name as H1, status line (e.g., `**Status: Done**`)
2. **Overview** — 1-2 sentence summary of what the feature does
3. **Decisions** — table of key design decisions and why
4. **Database Schema** — SQL if the feature has tables (include migration filename)
5. **Implementation** — key file paths and what they do
6. **Verification** — checklist of expected behaviors (checked when confirmed working)

Not every section is required — use what's relevant to the feature.

## Bug Documentation Format

### Quick Fixes — `bugs/log.md`

Add a row to the table for simple bugs that don't need investigation docs:

```markdown
| 2026-02-20 | Button misaligned on mobile | Dashboard | Added responsive padding | Closed |
```

### Complex Bugs — Individual Files

For bugs requiring root-cause analysis, create a file in `.claude/docs/bugs/` (e.g., `cursor-presence.md`):

1. **Title** — bug name as H1
2. **Status / Feature / Severity** — metadata block
3. **Description** — what happens and when
4. **Root cause** — why it happens
5. **Fix** — what was changed
6. **Key files** — affected source files

Add the bug to the Known Bugs table in `index.md`.

## Guidelines

- Always read the existing doc before modifying it
- Make surgical edits rather than rewriting entire sections
- Add notes about why decisions changed when context is useful
- If a change affects multiple features, update all affected specs
- Verification items should describe user-facing behavior, not implementation details
