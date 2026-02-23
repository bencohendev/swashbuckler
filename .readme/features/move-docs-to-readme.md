# Move Docs to .readme/

**Status: Done**

## Overview

Move project documentation from `.claude/docs/` to `.readme/` so it's more discoverable by contributors browsing the repository on GitHub. The `.claude/` directory is tool-specific and easy to overlook; `.readme/` is a conventional location for repo documentation that GitHub surfaces more naturally.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Target directory | `.readme/` | Conventional, discoverable, dot-prefix keeps it out of `src/` noise |
| CLAUDE.md updates | Update all paths | CLAUDE.md is the source of truth for doc locations — must stay accurate |
| Internal links | Relative links still work | Directory structure within `.readme/` stays the same (features/, bugs/, index.md) |
| `.claude/plans/` | Leave in place | Plan files are Claude Code working files, not project documentation |

## Scope

### What moves

```
.claude/docs/index.md         → .readme/index.md
.claude/docs/features/         → .readme/features/
.claude/docs/bugs/             → .readme/bugs/
.claude/docs/v1-archive.md    → .readme/v1-archive.md
```

### What stays

- `.claude/plans/` — plan mode working files (not documentation)
- `.claude/skills/` — skill definitions
- `CLAUDE.md` — project rules (stays at repo root, but paths inside get updated)

## Implementation

### Step 1: Move the directory

Use `git mv` to preserve blame history:

```bash
git mv .claude/docs .readme
```

### Step 2: Update CLAUDE.md

Replace all `.claude/docs/` references with `.readme/`:

| Line | Old | New |
|------|-----|-----|
| Feature specs path | `.claude/docs/features/` | `.readme/features/` |
| Bug tracking path | `.claude/docs/bugs/log.md` | `.readme/bugs/log.md` |
| Master index | `.claude/docs/index.md` | `.readme/index.md` |
| Create/update specs | `create/update its spec in .claude/docs/` | `create/update its spec in .readme/` |
| Plan mode reference | `create the permanent spec in .claude/docs/` | `create the permanent spec in .readme/` |
| grep command | `grep -l "Status.*Active" .claude/docs/features/` | `grep -l "Status.*Active" .readme/features/` |

### Step 3: Update doc-tracker skill

Update `.claude/skills/doc-tracker/` to reference `.readme/` instead of `.claude/docs/`.

### Step 4: Update auto-memory

Update `MEMORY.md` if it references `.claude/docs/` paths.

## Verification

- [ ] `.readme/` directory exists with all content from `.claude/docs/`
- [ ] `.claude/docs/` no longer exists
- [ ] `CLAUDE.md` references `.readme/` in all documentation paths
- [ ] `.claude/plans/` is untouched
- [ ] Internal links within `.readme/` (e.g., index.md linking to features/) resolve correctly
- [ ] `git log --follow .readme/index.md` shows full history
- [ ] Doc-tracker skill references updated
