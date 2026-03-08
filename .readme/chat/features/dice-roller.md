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

**Package:** `packages/dice-parser`

The parser lives in a shared package, not inside `apps/chat`. This is required for `apps/tabletop-sim` to import the same parser without modification — files inside one app cannot be imported by another app in this monorepo.

**File:** `packages/dice-parser/src/parser.ts`

- Standalone TypeScript module — no external dependencies
- Exports a single `parse(notation: string)` function via `packages/dice-parser/src/index.ts`
- Returns a structured result object (see Result Storage below) or throws on invalid notation

**Test file:** `packages/dice-parser/src/parser.test.ts`

All notation types must have unit test coverage. Edge cases: zero dice, very large counts, invalid syntax, pathological reroll inputs.

The parser enforces:
- Maximum of **100 dice per group** (e.g., `101d6` is rejected)
- Maximum of **100 reroll attempts** for `XdYrN` — if a reroll result still equals N after 100 attempts, the parser returns the last rolled value with a `reroll_limit_reached: true` flag in the group result. This prevents infinite loops on inputs like `2d1r1` where the condition can never be satisfied.

---

## Rate Limiting

The composer enforces a **client-side debounce of 500ms** between dice roll submissions. Back-to-back rapid submissions (e.g., keyboard macro spamming) are blocked — the send button re-enables after the debounce window passes. This is a UI-level safeguard only; a server-side rate limit can be added in a later phase if abuse is observed.

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
      "exploded": [],
      "reroll_limit_reached": false
    }
  ],
  "total": 14,
  "label": "Strength check"
}
```

Note: `"private"` is **not** stored in `metadata` — privacy is determined solely by `is_private_roll` on the message row. Storing it in both places would create ambiguity about which field is authoritative.

---

## Error Handling

When the user submits a `/r` command with invalid notation:

- An inline error is shown directly in the composer area (red text beneath the input), e.g., `Invalid notation: 2d`
- The message is **not sent**
- The error clears automatically when the user edits the input

---

## Private Rolls

- `is_private_roll = true` on the message row
- Direct queries (page load, history fetch) use `chat_messages_safe` view, which nulls `metadata` for private roll rows where `user_id <> auth.uid()`. See [chat-v1.md](chat-v1.md) for the view definition.
- **Realtime guard (client-side):** Supabase Realtime broadcasts the full row and cannot apply the view transformation. When a Realtime INSERT event arrives with `is_private_roll = true` AND `user_id !== currentUser.id`, the client **must** discard the event's `metadata` and render the placeholder immediately — do not trust the Realtime payload for private rolls you don't own
- Message content shown to others: `[private roll]`
- Roller sees the full `DiceResult` card

---

## Open Issues

All issues resolved:

- **Parser location** — resolved: `packages/dice-parser` (see Parser Module section)
- **Reroll loop** — resolved: 100-attempt cap with `reroll_limit_reached` flag in group result (see Parser Module section)
- **`metadata.private` redundancy** — resolved: field removed from JSONB schema; `is_private_roll` column is the sole authority

## Verification Checklist

- [ ] `/r` and `/roll` commands trigger a dice roll
- [ ] `/rp` and `!private` flag mark roll as private
- [ ] All notation types parse correctly (XdY, modifiers, exploding, kh/kl, reroll, successes, Fudge, mixed, label)
- [ ] Invalid notation shows an inline red error beneath the composer; message is not sent; error clears on edit
- [ ] Parser rejects groups exceeding 100 dice (e.g., `101d6`)
- [ ] `2d1r1` (pathological reroll) resolves with `reroll_limit_reached: true` instead of looping
- [ ] Result card renders full breakdown with kept/dropped/exploded indicators
- [ ] Private roll shows `[private roll]` to other members
- [ ] Roller sees full result for private rolls
- [ ] `metadata` contains no `"private"` field — `is_private_roll` column is authoritative
- [ ] Result stored in `metadata JSONB` with correct schema
- [ ] Rapid roll submissions are debounced (500ms) at the composer level
- [ ] Parser module has unit tests for all notation types and edge cases
- [ ] Parser (`packages/dice-parser`) is importable from `apps/tabletop-sim` without modification
