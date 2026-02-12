---
name: plan-tracker
description: Format and structure guidelines for feature spec documents in .claude/plans/. Use when creating or updating feature specs.
---

## Feature Spec Format

Feature specs are stored in `/.claude/plans/` as separate per-feature markdown documents with an index file.

### File Naming

- Use kebab-case slugs (e.g., `quick-capture.md`, `type-pages.md`)
- Add new files to the table in `index.md`

### Document Structure

Each spec should include:

1. **Title + Status** — feature name as H1, status line (e.g., `**Status: Done**`)
2. **Overview** — 1-2 sentence summary of what the feature does
3. **Decisions** — table of key design decisions and why
4. **Database Schema** — SQL if the feature has tables (include migration filename)
5. **Implementation** — key file paths and what they do
6. **Verification** — checklist of expected behaviors (checked when confirmed working)

Not every section is required — use what's relevant to the feature.

### Guidelines

- Always read the existing spec before modifying it
- Make surgical edits rather than rewriting entire sections
- Add notes about why decisions changed when context is useful
- If a change affects multiple features, update all affected specs
- Verification items should describe user-facing behavior, not implementation details
