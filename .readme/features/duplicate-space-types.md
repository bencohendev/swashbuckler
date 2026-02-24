# Duplicate Space Types

**Status:** Not started

## Summary

Duplicate all types from an existing space into a new space. When creating a new space, users can select a source space to copy its type definitions (name, slug, icon, properties, sort order) into the new space. This avoids manually recreating type setups across spaces.

## Open Questions

- Should this also copy templates associated with those types?
- Is this only available during space creation, or also as a standalone action (e.g., "Import types from another space")?
- How are property conflicts handled if the target space already has some types?
- Should entries be duplicated along with the types, or only the type definitions?
