# Dice Roller

**Status:** Not started
**Parent spec:** [Chat v1](chat-v1.md)

---

## Overview

A full TTRPG dice roller integrated into chat. Users type `/r` or `/roll` followed by standard notation; results appear as structured cards visible to the room. Private rolls hide the result from other members.

---

## Commands

| Command | Behavior |
|---------|----------|
| `/r <notation>` | Public roll — result visible to all members |
| `/roll <notation>` | Alias for `/r` |
| `/rp <notation>` | Private roll — result visible only to roller |
| `/r <notation> !private` | Private roll using inline flag |

`/roll` is the canonical command; `/r` is a convenience alias. The composer checks for a leading `/` and dispatches to the appropriate command handler — this is the extension point for future slash commands. Prefix collision (e.g., `/roll` vs a hypothetical `/r2d2`) must be resolved by longest-match dispatch.

---

## Notation Reference

| Notation | Description | Example |
|----------|-------------|---------|
| `XdY` | Roll X dice of Y sides | `2d6` |
| `+N` / `-N` | Modifier | `1d20+5` |
| `XdY!` | Exploding dice (max value re-rolls and adds) | `2d6!` |
| `XdYkhN` | Keep highest N dice | `4d6kh3` (D&D stat rolling) |
| `XdYklN` | Keep lowest N dice | `2d20kl1` (disadvantage) |
| `XdYrN` | Reroll values equal to N | `2d6r1` (Halfling Luck) |
| `XdYtN` | Count successes (dice showing N or higher) | `5d6t4` (World of Darkness) |
| `XdF` | Fudge/FATE dice (results: -1, 0, or +1) | `4dF` |
| Mixed groups | Multiple dice types summed | `1d8+2d6+3` |
| Label | Append descriptive text after notation | `2d6+3 Fireball damage` |

---

## Parser Module

**File:** `apps/chat/src/lib/dice/parser.ts`

- Standalone TypeScript module — no external dependencies
- Reusable in the tabletop simulator (`apps/tabletop-sim`) without modification
- Exports a single `parse(notation: string)` function
- Returns a structured result object (see Result Storage below) or throws on invalid notation

**Test file:** `apps/chat/src/lib/dice/parser.test.ts`

All notation types must have unit test coverage. Edge cases: zero dice, very large counts, invalid syntax.

The parser enforces a maximum of **100 dice per group** (e.g., `101d6` is rejected as invalid).

---

## Result Card Component

**Component:** `apps/chat/src/lib/components/DiceResult.svelte`

Renders a structured breakdown card in the message list:

- Full notation displayed (e.g., `4d6kh3 Strength check`)
- Each dice group shows individual roll values, with kept dice highlighted and dropped dice struck through
- Exploded dice marked with a `+` indicator
- Total shown prominently
- Private roll: card shows `[private roll]` placeholder to non-rollers; roller sees full result

---

## Result Storage

Dice rolls stored as `chat_messages` rows with:

- `type = 'dice'`
- `is_private_roll` boolean
- Full result in `metadata JSONB`:

```json
{
  "notation": "4d6kh3",
  "groups": [
    {
      "count": 4,
      "sides": 6,
      "rolls": [3, 5, 2, 6],
      "kept": [5, 6, 3],
      "dropped": [2],
      "exploded": []
    }
  ],
  "total": 14,
  "label": "Strength check",
  "private": false
}
```

---

## Error Handling

When the user submits a `/r` command with invalid notation:

- An inline error is shown directly in the composer area (red text beneath the input), e.g., `Invalid notation: 2d`
- The message is **not sent**
- The error clears automatically when the user edits the input

---

## Private Rolls

- `is_private_roll = true` on the message row
- RLS policy: only the `user_id` who sent the message can read `metadata` when `is_private_roll = true`
- Other members receive the message row with `metadata` redacted (nulled by RLS or a view)
- Message content shown to others: `[private roll]`
- Roller sees the full `DiceResult` card

---

## Verification Checklist

- [ ] `/r` and `/roll` commands trigger a dice roll
- [ ] `/rp` and `!private` flag mark roll as private
- [ ] All notation types parse correctly (XdY, modifiers, exploding, kh/kl, reroll, successes, Fudge, mixed, label)
- [ ] Invalid notation shows an inline red error beneath the composer; message is not sent; error clears on edit
- [ ] Parser rejects groups exceeding 100 dice (e.g., `101d6`)
- [ ] Result card renders full breakdown with kept/dropped/exploded indicators
- [ ] Private roll shows `[private roll]` to other members
- [ ] Roller sees full result for private rolls
- [ ] Result stored in `metadata JSONB` with correct schema
- [ ] Parser module has unit tests for all notation types and edge cases
- [ ] Parser is importable from `apps/tabletop-sim` without modification
