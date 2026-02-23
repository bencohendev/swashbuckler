---
name: find-work
description: Scan .readme/ for open work items — active features, not-started features, planned items without specs, and open bugs. Use when looking for something to work on.
user_invocable: true
---

## Instructions

Scan the project's `.readme/` documentation to find all available work, then present a concise summary.

### Steps

1. **Active features** — grep for `Status.*Active` in `.readme/features/` and list each with a one-line description of the open work scope (read each matching file to find it).

2. **Not-started features** — grep for `Status.*Not started` in `.readme/features/` and list each with its overview.

3. **Planned features without specs** — read `.readme/index.md`, find rows in the "Planned Features" table that do NOT link to a feature file (no `[...](...)` markdown link), and list them. These are ideas that still need a spec written.

4. **Open bugs** — read `.readme/bugs/log.md` and list any bugs in the "Open" section.

### Output Format

Print a summary grouped by category. Use this format:

```
## Active Features (in-progress work on existing features)
- **Feature Name** — what's left to do

## Not Started (specced but not built)
- **Feature Name** — overview

## Ideas (planned, no spec yet)
- **Item name** — description from index

## Open Bugs
- **Bug** — description
```

Omit any section that has zero items. If everything is empty, say "Nothing open — all features are done and no bugs are tracked."
