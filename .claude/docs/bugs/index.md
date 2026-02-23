# Bugs

Complex bugs with root-cause analysis get individual files. Quick fixes go in [log.md](log.md).

## Open

| Bug | Description |
|-----|-------------|
| Shared user can't create new entries | Guest/shared users unable to create new entries in shared spaces |
| Mobile slash menu unusable | Slash menu can't scroll or select options; keyboard opens then closes on mobile |
| Mobile graph broken | Can't zoom out, drag, or click nodes on mobile graph view |
| Graph filter search no-op | Graph filter/search input doesn't filter anything |
| Content flash on settings pages | Content flashes/flickers when navigating to settings pages |
| Delete types not working | Deleting a type from the settings page doesn't work |

## Closed

| Bug | Description |
|-----|-------------|
| [Unsaved changes on navigate](unsaved-changes-on-navigate.md) | Edits lost when clicking away from an entry before save completes |
| [Cursor presence not visible](cursor-presence.md) | Remote text cursors don't appear during collab editing |
| [Simultaneous join duplication](simultaneous-join.md) | Two users joining a doc at the same time causes content to double |
| Failing tests | 18 tests failing across 4 files — stale schemas/fixtures from remove-builtins migration and spaces changes |
| Middleware deprecation warning | Next.js 16 deprecated `middleware` file convention — migrate `src/middleware.ts` to `proxy` |
