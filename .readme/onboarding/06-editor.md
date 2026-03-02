# The Block Editor (Plate.js)

The rich-text editor is the most complex frontend feature in Swashbuckler. This document covers its architecture, plugin system, content model, auto-save behavior, and the critical gotchas you need to know before touching editor code.

---

## What is Plate.js?

Plate.js is a rich-text editor framework built on top of Slate.js. The relationship between the two is:

- **Slate.js** provides the core editor model: a document tree of nodes, a selection/cursor model, and a set of low-level operations (insert, delete, split, merge). Slate is framework-agnostic -- it models content, not DOM.
- **Plate.js** adds a React plugin system on top of Slate. Each plugin can define schema rules, keyboard handlers, React components for rendering nodes, and transform functions. Plate also provides pre-built plugins for common editing behaviors (bold, lists, tables, etc.).

The editor content is a tree of **nodes**. Elements (blocks like paragraphs and headings) contain child nodes. Text nodes are the leaves of the tree and carry formatting marks (bold, italic, etc.). Inline elements like mentions and links sit alongside text within block elements.

---

## Architecture Overview

The key pieces:

1. **`plate-config.ts`** -- declares all plugins and their options in a single `editorPlugins` array
2. **`Editor.tsx`** -- the main component, with two variants: `SoloEditor` and `CollaborativeEditor`
3. **`ObjectEditor.tsx`** -- the parent page component that loads object data, creates the save callback, and renders `<Editor>`
4. **`useAutoSave.ts`** -- debounced persistence for solo mode
5. **`store.ts`** -- Zustand store for editor state (`isDirty`, `isSaving`, `lastSaved`, `content`)
6. **`plugins/`** -- custom (non-library) plugins built for this app
7. **`components/elements/`** -- React components that render each node type

### How it fits together

```
ObjectEditor
  loads object.content from database
  creates handleContentSave callback
  renders <Editor initialContent={...} onSave={handleContentSave}>

Editor (SoloEditor or CollaborativeEditor)
  calls usePlateEditor({ plugins: editorPlugins, value, override: { components } })
  renders <Plate editor={editor} onChange={handleChange}>
            <PlateContent placeholder="Start writing..." />
          </Plate>

Each plugin registers:
  - node types (block elements, inline elements, leaf marks)
  - component overrides (how to render each type)
  - keyboard handlers, autoformat rules, etc.
```

---

## Plugin Configuration

All plugins are declared in `apps/web/src/features/editor/lib/plate-config.ts` as the `editorPlugins` array. Order matters -- `NodeIdPlugin` must be first because other plugins depend on node IDs.

### Text Formatting (Marks)

These are leaf-level marks applied to text nodes:

| Plugin | What it does |
|---|---|
| `BoldPlugin` | `**bold**` text |
| `ItalicPlugin` | `*italic*` text |
| `UnderlinePlugin` | Underlined text |
| `StrikethroughPlugin` | `~~strikethrough~~` text |
| `CodePlugin` | `` `inline code` `` |
| `SpoilerPlugin` (custom) | Hidden text revealed on click (`\|\|spoiler\|\|`) |
| `PrivateMarkPlugin` (custom) | Inline text hidden from shared users (`\|\|\|private\|\|\|`), toggled with Cmd+Shift+P |

### Block Types (Elements)

These are top-level or nested block elements:

| Plugin | Type string | Notes |
|---|---|---|
| `HeadingPlugin` | `h1`, `h2`, `h3` | Configured for 3 levels |
| `BlockquotePlugin` | `blockquote` | |
| `CodeBlockPlugin` | `code_block` | Contains `code_line` children |
| `ListPlugin` | `ul`, `ol`, `li` | Ordered and unordered lists |
| `TodoListPlugin` | `action_item` | Checkbox list items |
| `TogglePlugin` | `toggle` | Collapsible sections |
| `CalloutPlugin` | `callout` | Highlighted callout blocks with variants |
| `PrivateBlockPlugin` (custom) | `private_block` | Entire blocks hidden from shared users |
| `TablePlugin` | `table`, `tr`, `td`, `th` | Configured with `minColumnWidth: 48`, margins disabled |
| `ImagePlugin` | `img` | Upload handled via `uploadImageFromDataUrl` in Supabase storage |

### Inline Elements

| Plugin | Type string | Notes |
|---|---|---|
| `LinkPlugin` | `a` | URL links. Has a custom `overrideEditor` that calls `focusEditorAtSelection` after link wrapping to prevent cursor jumps |
| `MentionPlugin` | `mention` | `@` trigger for object references. Stores `objectId` and `objectTitle` |
| `MentionInputPlugin` | `mention_input` | Transient node while the user is typing a mention query |
| `SlashPlugin` | (trigger only) | `/` command trigger |
| `SlashInputPlugin` | `slash_input` | Transient node while the slash menu is open |
| `TemplateVariablePlugin` (custom) | `template_variable` | `{{variable_name}}` inline void elements |

### Structure and Behavior

| Plugin | What it does |
|---|---|
| `NodeIdPlugin` | Assigns unique IDs to every node. Must be first in the array. |
| `IndentPlugin` | Block indentation |
| `ExitBreakPlugin` | Cmd+Enter exits below code blocks, tables, and private blocks. Cmd+Shift+Enter exits above. |
| `TrailingBlockPlugin` | Ensures an empty paragraph always exists at the end of the document (type `p`) |
| `DndPlugin` | Drag-and-drop block reordering with `enableScroller` |
| `BlockSideMenuPlugin` (custom) | Notion-style gutter handle on hover (grip + dropdown menu with insert/duplicate/move/delete actions) |
| `AutoformatPlugin` | Markdown-style shortcuts (see table below) |

### Autoformat Rules

The `AutoformatPlugin` converts typed patterns into formatted content:

| Input | Result | Mode |
|---|---|---|
| `**text**` | Bold | mark |
| `*text*` or `_text_` | Italic | mark |
| `~~text~~` | Strikethrough | mark |
| `` `text` `` | Inline code | mark |
| `\|\|\|text\|\|\|` | Private mark | mark |
| `\|\|text\|\|` | Spoiler | mark |
| `# ` | Heading 1 | block |
| `## ` | Heading 2 | block |
| `### ` | Heading 3 | block |
| `> ` | Blockquote | block |
| ` ``` ` | Code block | block |
| `[] ` | Todo list item | block |
| `* ` or `- ` | Bulleted list | block |
| `1. ` or `1) ` | Numbered list | block |

Note: The private mark rule (`|||`) must come before the spoiler rule (`||`) in the config to avoid prefix conflicts.

---

## The Editor Component

`apps/web/src/features/editor/components/Editor.tsx`

The `Editor` export is a thin router that renders either `SoloEditor` or `CollaborativeEditor` based on whether `collaborationOptions` is provided.

### SoloEditor

Standard single-user editing:

```
SoloEditor
  usePlateEditor({ plugins: editorPlugins, value: editorValue, override: { components } })
  useAutoSave({ onSave, contentRef })
  onChange -> contentRef.current = value; markAutoSaveDirty(); setContent(value)
```

Key details:
- Content is passed as `value` to `usePlateEditor`
- A per-instance `contentRef` isolates content from the global Zustand store (multiple editors can coexist, e.g., page editor + modal editor)
- After mount, `markAutoSaveClean()` is called to clear the false-positive dirty flag from Plate's initialization `onChange`

### CollaborativeEditor

Yjs CRDT-based real-time editing:

```
CollaborativeEditor
  usePlateEditor({ plugins: [...editorPlugins, YjsPlugin], override: { components } })
  // NO value passed -- Yjs manages state
  Y.Doc seeding -> YjsEditor.connect(editor) -> provider.connect()
```

Critical differences from solo mode:
- `YjsPlugin` is appended to the plugin array with the shared `ydoc`, `awareness`, and `provider`
- **Do NOT pass `value`** -- the Y.Doc seeds the content and syncs to Slate. Passing value causes "Path doesn't match yText" errors.
- Y.Doc seeding uses a fixed `clientID = 0` so every peer produces identical Yjs structs (prevents content duplication when a second peer seeds)
- Auto-save uses leader election: only the peer with the lowest `awareness.clientID` persists to the database
- On unmount, a force-save fires (skipping leader election) to avoid data loss

### Component Overrides

The `COMPONENT_OVERRIDES` map in `Editor.tsx` maps Slate node type strings to React components:

```typescript
const COMPONENT_OVERRIDES = {
  p: ParagraphElement,
  h1: H1Element,
  h2: H2Element,
  h3: H3Element,
  blockquote: BlockquoteElement,
  code_block: CodeBlockElement,
  code_line: CodeLineElement,
  ul: BulletedListElement,
  ol: NumberedListElement,
  li: ListItemElement,
  toggle: ToggleElement,
  callout: CalloutElement,
  table: TableElement,
  tr: TableRowElement,
  td: TableCellElement,
  th: TableHeaderCellElement,
  img: ImageElement,
  a: LinkElement,
  mention: MentionElement,
  mention_input: MentionInputElement,
  slash_input: SlashInputElement,
  template_variable: TemplateVariableElement,
  private_block: PrivateBlockElement,
  action_item: TodoListElement,
};
```

These components live in `apps/web/src/features/editor/components/elements/` and `apps/web/src/features/editor/plugins/` (for custom plugin elements like `PrivateBlockElement`).

---

## Content Model

Editor content is a JSON tree (array of Slate nodes) stored in the database as the object's `content` field. It is never HTML.

### Example Document

```json
[
  {
    "id": "abc123",
    "type": "h1",
    "children": [{ "text": "My Title" }]
  },
  {
    "id": "def456",
    "type": "p",
    "children": [
      { "text": "Some text with " },
      { "text": "bold", "bold": true },
      { "text": " and a " },
      {
        "type": "mention",
        "objectId": "550e8400-e29b-41d4-a716-446655440000",
        "objectTitle": "Related Page",
        "children": [{ "text": "" }]
      }
    ]
  },
  {
    "id": "ghi789",
    "type": "img",
    "url": "https://...",
    "children": [{ "text": "" }]
  }
]
```

### Node Categories

- **Elements (blocks):** Top-level nodes with a `type` and `children`. Paragraphs (`p`), headings (`h1`-`h3`), lists (`ul`, `ol`), tables, code blocks, images, etc.
- **Text nodes:** Leaf nodes with a `text` property and optional mark booleans (`bold`, `italic`, `code`, `spoiler`, `private`, etc.). No `type` field.
- **Inline elements:** Elements that sit within a block's `children` alongside text nodes. Mentions (`mention`), links (`a`), template variables (`template_variable`).
- **Void elements:** Elements with no user-editable content. Images (`img`), template variables. They still require a `children: [{ text: "" }]` array (Slate invariant).

### Type Definitions

Full TypeScript types for every node are in `apps/web/src/features/editor/types.ts`. Key types:

- `EditorContent` -- alias for Plate's `Value` (an array of nodes)
- `TextNode` -- text leaf with all possible marks
- `BaseNode` -- base element with `id`, `type`, `children`
- Specific node types: `ParagraphNode`, `HeadingNode`, `MentionNode`, `ImageNode`, etc.
- `EditorNode` -- union of all element types

### Content Validation

`sanitizeContent()` in `apps/web/src/features/editor/lib/sanitizeContent.ts` validates that content is a non-empty array where every top-level node has a `type` (string) and `children` (array). Deep validation is left to Plate's built-in normalizer. Malformed content returns `null` and the editor falls back to `initialEditorValue` (a single empty paragraph).

---

## Auto-Save

### Solo Mode

`apps/web/src/features/editor/hooks/useAutoSave.ts`

The `useAutoSave` hook debounces saves with a configurable delay (default: 1000ms):

1. Editor `onChange` fires, calling `markAutoSaveDirty()` which sets a per-instance `localDirtyRef`
2. The hook subscribes to Zustand store's `content` for reactivity but gates actual saves on `localDirtyRef`
3. After the debounce timeout, `save()` reads content from the per-instance `contentRef` (not the global store)
4. On save: sets `isSaving = true`, calls `onSave(content)`, then sets `lastSaved` and `isSaving = false`
5. On failure: re-marks dirty so the next change retries
6. On unmount: cancels pending timeout and fires a synchronous save if dirty
7. `beforeunload` handler warns before tab close if there are unsaved changes

The per-instance `localDirtyRef` and `contentRef` pattern prevents one editor instance from saving another's content when multiple editors coexist (e.g., page editor + object modal).

### Collaborative Mode

Auto-save in collaborative mode is handled inline in `CollaborativeEditor`, not via `useAutoSave`:

1. Listens to `doc.on('update', handler)` for Y.Doc changes
2. Debounces with a 3-second timeout
3. Before saving, performs **leader election**: queries all awareness states and only saves if this client has the lowest `clientID`
4. On unmount: force-saves without leader election (the peer is leaving, so save whatever is current)
5. Save callbacks are stabilized via refs to prevent stale closures

### Editor State Store

`apps/web/src/features/editor/store.ts`

A global Zustand store tracks:

| Field | Type | Purpose |
|---|---|---|
| `content` | `Value` | Current editor content |
| `isDirty` | `boolean` | Whether there are unsaved changes |
| `isSaving` | `boolean` | Whether a save is in progress |
| `lastSaved` | `Date \| null` | Timestamp of last successful save |
| `isCollaborative` | `boolean` | Whether collaborative mode is active |

Actions: `setContent`, `markDirty`, `markClean`, `setSaving`, `setLastSaved`, `setCollaborative`, `reset`.

Note: this is a single global store that assumes one active editor at a time. The per-instance refs in `useAutoSave` work around this for the multi-editor case, but the store itself is shared.

---

## The Slate-DOM Dual Copy Problem

This is the single most important gotcha in the editor codebase.

### The Problem

Two copies of `slate-dom` exist in `node_modules`:

- **0.123.0** (top-level) -- used by `slate-react`
- **0.114.0** (nested under `@udecode/slate`) -- a different version bundled with Plate's internals

Both copies maintain their own `WeakMap` instances (e.g., `EDITOR_TO_ELEMENT`, `NODE_TO_KEY`). When code calls `editor.api.toDOMNode` or `editor.api.toDOMRange`, it may go through the wrong copy whose WeakMaps are empty, causing "Cannot resolve a DOM node" crashes.

### The Fix

`apps/web/src/features/editor/lib/patchSlateDom.ts`

This file is imported at the very top of `Editor.tsx` (before any Slate/Plate imports use it). It monkey-patches `DOMEditor.toDOMNode` from the **top-level** `slate-dom` (the correct copy):

1. Wraps the original `toDOMNode` in a try-catch
2. If it throws for the editor-as-node case: falls back to a DOM query for `[data-slate-editor]`
3. If it throws for any case: returns a disconnected `<div>` element as a safe no-op (callers like `onDOMSelectionChange` check `el.contains(selectionNode)` which returns `false` on the disconnected element, so they skip processing)

Similarly, `focusEditor.ts` imports `DOMEditor` directly from the top-level `slate-dom` to ensure correct WeakMap access when restoring cursor position.

### When This Matters

- Cursor positioning after mention/link insertion
- Selection restoration after focus changes
- React Strict Mode double-renders (unmount/remount timing gaps)
- Multiple Slate editors on the same page

---

## Mention System

The mention system connects editor content to the object graph via `@` references.

### User Flow

1. User types `@` in the editor
2. `MentionPlugin` (trigger: `@`, only when preceded by whitespace or start of text) inserts a transient `mention_input` node
3. `MentionInputElement` renders an inline trigger (`@`) with an auto-focused text input and a portaled dropdown
4. The dropdown searches objects via `dataClient.objects.search(query)` and shows results grouped with "Create New" options per type
5. Keyboard navigation (arrow keys, Enter, Escape) and mouse selection are both supported
6. On selection: the `mention_input` node is removed and a permanent `mention` node is inserted with `objectId` and `objectTitle`
7. `focusEditorAtSelection` restores editor focus after the dropdown is dismissed

### Mention Persistence

On every save (`handleContentSave` in `ObjectEditor.tsx`):

1. `extractMentionIds(content)` walks the entire content tree, collecting `objectId` from every `mention` node into a deduplicated array
2. `dataClient.relations.syncMentions(objectId, mentionIds)` diffs current mention relations against the extracted IDs, creating and deleting `object_relations` records as needed (with `relation_type: 'mention'`)
3. `emit('objectRelations')` triggers cache invalidation for any components displaying relations

The extraction function is in `apps/web/src/features/relations/lib/extractMentions.ts`.

---

## Slash Commands

The slash command system provides a Notion-style `/` menu for inserting block types.

### User Flow

1. User types `/` (only when preceded by whitespace or at text start, per `triggerPreviousCharPattern`)
2. `SlashPlugin` inserts a transient `slash_input` node
3. `SlashInputElement` renders a floating `SlashMenu` component
4. `SlashMenu` (`apps/web/src/features/editor/components/SlashMenu.tsx`) displays items grouped by category:
   - **Basic:** Text, Heading 1, Heading 2, Heading 3
   - **Lists:** Bulleted list, Numbered list, Toggle
   - **Media:** Image
   - **Advanced:** Quote, Code, Callout, Table
5. Items filter as the user types after `/`
6. On selection: the current block is transformed to the chosen type

---

## Private Content

Private content allows space owners to include notes that shared users cannot see.

### Two Levels

- **`PrivateMarkPlugin`** -- inline text mark. Applied with `|||text|||` autoformat or Cmd+Shift+P. Renders with a dashed purple border for owners, hidden for non-owners.
- **`PrivateBlockPlugin`** -- block-level element. Renders as a purple dashed container with an "eye-off" icon and "Private" label for owners, hidden for non-owners.

### Stripping for Shared Users

`stripPrivateContent()` in `apps/web/src/features/editor/lib/stripPrivateContent.ts` recursively walks the content tree:

1. Removes all `private_block` elements entirely
2. Removes text nodes with `private: true` mark
3. Ensures parent elements retain at least one `{ text: '' }` child (Slate requires non-empty children arrays)

This is called in `ObjectEditor.tsx` before passing content to the editor when the current user is a non-owner without edit permission:

```typescript
const editorContent = useMemo(() => {
  if (!isOwner && !canEdit && object?.content) {
    return stripPrivateContent(object.content)
  }
  return object?.content ?? undefined
}, [isOwner, canEdit, object?.content])
```

---

## Template Variables

The `TemplateVariablePlugin` supports `{{variable_name}}` placeholders in template content.

### How It Works

- `TemplateVariablePlugin` (`apps/web/src/features/editor/plugins/template-variable-plugin.ts`) declares an **inline void element** with key `template_variable`
- `TemplateVariableElement` (`apps/web/src/features/editor/components/elements/TemplateVariable.tsx`) renders variables as amber-colored inline chips showing `{{variableName}}`
- Each node carries `variableName` (string) and `variableType` (`'builtin'` or `'custom'`)
- When a template is applied, the template application logic resolves variables against a `VariableResolutionContext` (providing `userName`, `spaceName`, etc.) and replaces chips with actual text

---

## Block Side Menu

The `BlockSideMenuPlugin` provides a Notion-style gutter with a drag handle and actions menu.

### How It Works

1. `BlockSideMenuPlugin` (`apps/web/src/features/editor/plugins/block-side-menu-plugin.tsx`) uses Plate's `render.aboveNodes` to wrap **top-level elements only** (path length === 1) with a `BlockWrapperShell`
2. The wrapper is split into `BlockWrapperShell` (no hooks -- required because `aboveNodes` is conditionally applied) and `BlockWrapperInner` (hooks allowed)
3. On desktop in edit mode: renders `DraggableBlockWrapper` with a `BlockGutter`
4. Hidden on mobile and in read-only mode
5. `BlockGutter` (`apps/web/src/features/editor/components/BlockGutter.tsx`) renders:
   - A drag grip handle (connected to `useDraggable` from `@udecode/plate-dnd`)
   - A dropdown menu with: Insert above, Insert below, Duplicate, Move up, Move down, Delete
6. The gutter appears on hover (`opacity-0 group-hover:opacity-100`) and stays visible when the menu is open

---

## Error Handling

`EditorErrorBoundary` (`apps/web/src/features/editor/components/EditorErrorBoundary.tsx`) wraps the editor in `ObjectEditor.tsx`. If the editor crashes (e.g., from corrupted content), it catches the error and renders a "Reset editor" button that bumps `contentVersion`, forcing a full re-mount.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `apps/web/src/features/editor/lib/plate-config.ts` | Plugin array and initial editor value |
| `apps/web/src/features/editor/components/Editor.tsx` | Main editor component (Solo + Collaborative) |
| `apps/web/src/features/editor/hooks/useAutoSave.ts` | Debounced auto-save hook for solo mode |
| `apps/web/src/features/editor/store.ts` | Zustand store for editor state |
| `apps/web/src/features/editor/types.ts` | TypeScript types for all node types |
| `apps/web/src/features/editor/lib/patchSlateDom.ts` | Monkey-patch for slate-dom dual copy issue |
| `apps/web/src/features/editor/lib/focusEditor.ts` | Focus restoration with correct DOMEditor |
| `apps/web/src/features/editor/lib/sanitizeContent.ts` | Content validation before loading into editor |
| `apps/web/src/features/editor/lib/stripPrivateContent.ts` | Removes private nodes for shared users |
| `apps/web/src/features/editor/plugins/spoiler-plugin.tsx` | Spoiler mark (click to reveal) |
| `apps/web/src/features/editor/plugins/private-plugin.tsx` | Private mark + private block plugins |
| `apps/web/src/features/editor/plugins/template-variable-plugin.ts` | Template variable inline void element |
| `apps/web/src/features/editor/plugins/block-side-menu-plugin.tsx` | Gutter drag handle and block actions |
| `apps/web/src/features/editor/components/elements/` | React components for each element type |
| `apps/web/src/features/editor/components/marks/index.tsx` | React components for text marks |
| `apps/web/src/features/editor/components/MentionInput.tsx` | Mention dropdown (legacy, see elements/Mention.tsx) |
| `apps/web/src/features/editor/components/SlashMenu.tsx` | Slash command palette |
| `apps/web/src/features/editor/components/BlockGutter.tsx` | Block gutter with drag + actions |
| `apps/web/src/features/editor/components/EditorErrorBoundary.tsx` | Error boundary with reset |
| `apps/web/src/features/objects/components/ObjectEditor.tsx` | Parent component that renders the editor |
| `apps/web/src/features/relations/lib/extractMentions.ts` | Walks content tree to extract mention IDs |

---

## Gotchas

1. **The slate-dom dual copy issue.** This is the most common source of editor bugs. Always import `DOMEditor` from the top-level `slate-dom`, never from `@udecode/slate`. Read `patchSlateDom.ts` to understand the fix.

2. **Do not pass `value` to `usePlateEditor` in collaboration mode.** The Y.Doc seeds content and syncs it to Slate. Passing `value` creates a mismatch between the Slate tree and Y.Doc tree, causing "Path doesn't match yText" errors.

3. **Content is JSON, not HTML.** Serialization is built into Slate's node model. There is no HTML conversion step.

4. **NodeIdPlugin must be first in the plugins array.** Other plugins (drag-and-drop, collaboration) depend on every node having a unique `id`.

5. **AutoformatPlugin markdown shortcuts can surprise users.** Typing `# ` at the start of a line converts the block to an h1. This is intentional but worth knowing.

6. **Private mark autoformat (`|||`) must precede spoiler (`||`) in the config.** Otherwise `|||` matches as `||` + `|`.

7. **BlockSideMenuPlugin uses a hook-free shell wrapper.** The `aboveNodes` mechanism conditionally applies the wrapper (only for top-level elements), so the wrapper component itself cannot contain hooks. The shell delegates to an inner component that is rendered as JSX (its own component instance) to safely use hooks.

8. **Plate fires `onChange` during initialization.** Both `SoloEditor` and `CollaborativeEditor` clear the dirty flag immediately after mount to avoid a false-positive "unsaved changes" state.

9. **Multiple editors can coexist.** The global Zustand store is shared, but per-instance `contentRef` and `localDirtyRef` in `useAutoSave` prevent cross-contamination between editors.

10. **`focusEditorAtSelection` uses a `setTimeout(fn, 0)`.** This waits one tick for React to commit DOM changes before restoring focus and selection. Without this, the browser places the cursor at a default position.

---

## Exercises

1. Open `apps/web/src/features/editor/lib/plate-config.ts` and identify which plugins are custom (imported from `../plugins/`) versus library plugins (imported from `@udecode/`).

2. Trace the `@` mention flow end-to-end: find where `MentionPlugin` is configured with `trigger: '@'`, then read `MentionInputElement` in `apps/web/src/features/editor/components/elements/Mention.tsx` to see how the dropdown renders, searches, and inserts a mention node. Follow the save path in `ObjectEditor.tsx` to see how `extractMentionIds` and `syncMentions` persist mention relations.

3. Read `apps/web/src/features/editor/hooks/useAutoSave.ts` and the collaborative auto-save code in `CollaborativeEditor`. Compare how dirty state is tracked and how leader election works (look for the `awareness.getStates()` loop that finds the lowest `clientID`).

4. Find `stripPrivateContent` in `apps/web/src/features/editor/lib/stripPrivateContent.ts` and trace where it is called in `ObjectEditor.tsx`. Understand what conditions trigger content stripping (`!isOwner && !canEdit`) and how the Slate invariant (non-empty children arrays) is maintained.
