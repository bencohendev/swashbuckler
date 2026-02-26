# Todo Block

**Status:** Not started

## Overview

Checkbox/task list block type for the editor. Each todo item has a clickable checkbox that toggles checked/unchecked state, with visual strikethrough on completed items.

## Decisions

| Area | Decision | Why |
|------|----------|-----|
| Plugin | Plate.js `TodoListPlugin` from `@udecode/plate-list/react` | Already ships with v48, handles Enter/Backspace behavior |
| Node type | `action_item` (flat block, not nested `ul > li`) | Plate's built-in key for todo list items |
| Checked state | `checked` boolean on the node | Standard Plate convention, works with Yjs out of the box |
| Checkbox | Native `<input type="checkbox">` in `contentEditable={false}` wrapper | Built-in keyboard/screen reader support |
| Checked styling | `line-through` + `opacity-60` | Clear visual distinction without hiding content |
| Autoformat | `[] ` (bracket-bracket-space) | Avoids conflict with `- ` bullet shortcut |
| Slash menu | "To-do list" under Lists category with `ListTodo` icon | Consistent with existing list block placement |

## Implementation

| File | Change |
|------|--------|
| `features/editor/lib/plate-config.ts` | Import `TodoListPlugin`, add to plugin array after `ListPlugin`; add `[] ` autoformat rule before bullet rules |
| `features/editor/components/elements/TodoList.tsx` | **New** — `TodoListElement` component using `useTodoListElementState` + `useTodoListElement` hooks |
| `features/editor/components/elements/index.ts` | Export `TodoListElement` |
| `features/editor/components/Editor.tsx` | Add `action_item: TodoListElement` to `COMPONENT_OVERRIDES` |
| `features/editor/components/elements/SlashInput.tsx` | Add "To-do list" menu item under Lists; add `action_item` node creation in `selectItem` |

## Verification

- [ ] Type `[] ` to create a todo item via autoformat
- [ ] Insert via slash menu (`/to-do`)
- [ ] Click checkbox to toggle checked/unchecked
- [ ] Checked items show strikethrough + reduced opacity
- [ ] Enter creates a new unchecked todo item
- [ ] Backspace on empty todo converts to paragraph
- [ ] Works in collaborative (Yjs) mode
- [ ] Checkbox is keyboard accessible (Tab + Space)
- [ ] Types pass (`tsc --noEmit`), tests pass, lint clean
