---
name: plan-tracker
description: Tracks feature plans and keeps them up to date. IMPORTANT - invoke this skill proactively after completing any implementation that adds, changes, or removes features. Also use when discussing features or planning new features.
---

## Plan Tracking

Plan documents are stored in the `/.claude/plans/` directory, organized as **separate per-feature documents** with an index file.

### File Structure

```
.claude/plans/
├── index.md          # High-level overview linking to all feature plans
├── v1.md             # Original monolithic plan (legacy reference)
├── auth.md           # Authentication & authorization
├── objects.md        # Object system, types, properties
├── editor.md         # Block editor (Plate.js)
├── templates.md      # Template system
├── sharing.md        # Workspace sharing & exclusions
├── graph.md          # Knowledge graph visualization
├── search.md         # Global search
├── sidebar.md        # Sidebar navigation
├── spaces.md         # Spaces/multi-workspace
└── ...               # Additional features as needed
```

### When to Act

Update plan documents whenever any of the following occur:

1. **A new feature is discussed** — check `/.claude/plans/` for an existing plan. If one exists, update it. If none exists and the feature is substantial, create a new document and add it to `index.md`.

2. **Implementation changes** from what was originally planned — update the relevant plan document to reflect actual implementation. This includes:
   - Tech choices (libraries, patterns, approaches)
   - Database schema changes
   - API or data model changes
   - Feature scope changes (additions, removals, deferrals)
   - Architecture decisions

3. **A feature is completed** — mark relevant items as done in the plan document.

### Guidelines

- Always read the existing plan document before modifying it
- Preserve the overall structure and format of existing documents
- Make surgical edits rather than rewriting entire sections
- Add notes about why decisions changed when context is useful
- Keep plan documents as the source of truth for what was decided and why
- If a change affects multiple features, update all affected documents
- Keep `index.md` updated when adding new feature plans
- Use the feature filename as a kebab-case slug (e.g., `quick-capture.md`)
