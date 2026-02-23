# Bugs

Complex bugs with root-cause analysis get individual files. Quick fixes go in [log.md](log.md).

| Bug | Description | Status |
|-----|-------------|--------|
| [Cursor presence not visible](cursor-presence.md) | Remote text cursors don't appear during collab editing | Closed |
| [Simultaneous join duplication](simultaneous-join.md) | Two users joining a doc at the same time causes content to double | Closed |
| [Unsaved changes on navigate](unsaved-changes-on-navigate.md) | Edits lost when clicking away from an entry before save completes | Open |
| Failing tests | 18 tests failing across 4 files (local.test.ts, validation.test.ts, ObjectItem.test.tsx, useObjects.test.tsx) — stale schemas/fixtures from remove-builtins migration and spaces changes | Open |
| Middleware deprecation warning | Next.js 16 deprecated `middleware` file convention — migrate `src/middleware.ts` to `proxy` | Open |
| Shared user can't create new entries | Guest/shared users unable to create new entries in shared spaces | Open |
| Mobile slash menu unusable | Slash menu can't scroll or select options; keyboard opens then closes on mobile | Open |
| Mobile graph broken | Can't zoom out, drag, or click nodes on mobile graph view | Open |
| Graph filter search no-op | Graph filter/search input doesn't filter anything | Open |
| Content flash on settings pages | Content flashes/flickers when navigating to settings pages | Open |
| Delete types not working | Deleting a type from the settings page doesn't work | Open |
