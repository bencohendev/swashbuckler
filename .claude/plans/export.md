# Export

**Status: Done**

## Overview

Full-account JSON data export accessible from account settings. Exports all user data across all spaces in a single downloadable file.

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Format | JSON | Structured, lossless, easy to re-import later |
| Scope | Full account (all spaces) | Users expect a complete backup |
| Trigger | Manual button in account settings | Low-frequency action, no need for automation |
| File naming | `swashbuckler-export-YYYY-MM-DD.json` | Clear, sortable by date |

## Implementation

| File | Role |
|------|------|
| `src/features/account/hooks/useAccountExport.ts` | Export logic — fetches all data, assembles payload, triggers download |
| `src/features/account/components/DataExportSection.tsx` | UI — export button with loading/error states |

## Payload Shape

```json
{
  "exportedAt": "ISO 8601 timestamp",
  "spaces": [],
  "objects": [],
  "objectTypes": [],
  "templates": [],
  "objectRelations": [],
  "tags": [],
  "objectTags": [],
  "pins": []
}
```

Data is collected per-space (objects, objectTypes, templates, relations, tags, objectTags) then merged. Pins are fetched once (user-scoped, not space-scoped).

## Verification

- [x] "Export all data" button visible in account settings
- [x] Clicking export downloads a JSON file
- [x] Exported JSON contains all spaces, entries, types, templates, relations, tags, objectTags, and pins
- [x] File is named with current date
- [x] Loading state shown during export
- [x] Error state displayed if export fails
