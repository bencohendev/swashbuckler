# Global Types

**Status:** Not started

## Summary

Allow creating types outside of any space (global/unscoped types) that can then be assigned into one or more spaces. Currently all types are scoped to a single space — this feature decouples type definition from space ownership, enabling reuse across spaces.

## Open Questions

- Can a global type be assigned to multiple spaces simultaneously, or is it a one-time copy/import?
- How does this interact with the existing per-space unique slug constraint?
- Where do global types live in the UI — a dedicated section in settings?
- What happens to entries when a global type is removed from a space?
