'use client';

import { createContext, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Plate, PlateContent, usePlateEditor } from '@udecode/plate/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Value } from '@udecode/plate';
import type { SupabaseYjsProvider } from '@/features/collaboration/lib/supabase-yjs-provider';
import { YjsPlugin } from '@udecode/plate-yjs/react';
import { YjsEditor, slateNodesToInsertDelta, slateRangeToRelativeRange, type YjsEditor as YjsEditorType } from '@slate-yjs/core';
import type { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';

import { editorPlugins, initialEditorValue } from '../lib/plate-config';
import {
  ParagraphElement,
  H1Element,
  H2Element,
  H3Element,
  BlockquoteElement,
  CodeBlockElement,
  CodeLineElement,
  BulletedListElement,
  NumberedListElement,
  ListItemElement,
  ToggleElement,
  CalloutElement,
  TableElement,
  TableRowElement,
  TableCellElement,
  TableHeaderCellElement,
  ImageElement,
  LinkElement,
  MentionElement,
  MentionInputElement,
  SlashInputElement,
  TemplateVariableElement,
  TodoListElement,
} from './elements';
import { PrivateBlockElement } from '../plugins/private-plugin';
import { useEditorStore } from '../store';
import { useAutoSave } from '../hooks/useAutoSave';
import { RemoteCursorOverlay } from '@/features/collaboration/components/RemoteCursorOverlay';

/** Narrow a Plate editor to YjsEditor. Safe because YjsPlugin wraps it with withTYjs. */
function toYjsEditor(editor: unknown): YjsEditorType {
  const e = editor as Record<string, unknown>
  if (typeof e.connect !== 'function' || typeof e.sharedRoot !== 'object') {
    throw new Error('Editor is not a YjsEditor — ensure YjsPlugin is included in plugins')
  }
  return editor as YjsEditorType
}

export const EditorModeContext = createContext<{ isTemplateMode: boolean; isOwner: boolean }>({ isTemplateMode: false, isOwner: true });

export interface CollaborationOptions {
  provider: SupabaseYjsProvider
  doc: Y.Doc
  awareness: Awareness
  cursorData: { name: string; color: string; avatarUrl?: string }
}

export interface EditorHandle {
  applyContent: (content: Value, mode: 'replace' | 'prepend') => void
}

interface EditorProps {
  initialContent?: Value;
  onSave?: (content: Value) => Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
  isTemplateMode?: boolean;
  isOwner?: boolean;
  collaborationOptions?: CollaborationOptions;
  ref?: React.Ref<EditorHandle>;
}

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
} as const;

/**
 * Solo (non-collaborative) editor — the original behavior.
 */
function SoloEditor({
  initialContent,
  onSave,
  readOnly,
  placeholder,
  isTemplateMode,
  isOwner = true,
}: Omit<EditorProps, 'collaborationOptions'>) {
  const { setContent, isSaving, isDirty, lastSaved } = useEditorStore();
  const editorValue = initialContent || initialEditorValue;

  const editor = usePlateEditor({
    plugins: editorPlugins,
    value: editorValue,
    override: { components: COMPONENT_OVERRIDES },
  });

  const handleChange = useCallback(
    (value: { value: Value }) => {
      setContent(value.value);
    },
    [setContent]
  );

  useAutoSave({
    onSave: onSave || (async () => {}),
    enabled: !!onSave && !readOnly,
  });

  // Clear dirty flag after mount — Plate fires onChange during initialization which
  // marks the store dirty even though the user hasn't edited anything yet.
  // This runs after useAutoSave's effects so the debounce timer (if started) will
  // re-evaluate isDirty from the store and see false.
  useEffect(() => {
    useEditorStore.getState().markClean();
  }, []);

  return (
    <EditorModeContext value={{ isTemplateMode: isTemplateMode ?? false, isOwner }}>
      <DndProvider backend={HTML5Backend}>
        <div className="relative min-h-[200px]">
          <Plate editor={editor} onChange={handleChange}>
            <PlateContent
              readOnly={readOnly}
              placeholder={placeholder}
              className="prose prose-sm max-w-none min-h-[200px] outline-none dark:prose-invert"
            />
          </Plate>

          {onSave && (
            <div className="absolute right-2 top-2 text-xs text-gray-400">
              {isSaving ? 'Saving...' : isDirty ? 'Edited' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : null}
            </div>
          )}
        </div>
      </DndProvider>
    </EditorModeContext>
  );
}

/**
 * Collaborative editor with Yjs CRDT sync.
 * Rendered as a separate component so the YjsPlugin is always included from first render.
 */
function CollaborativeEditor({
  initialContent,
  onSave,
  readOnly,
  placeholder,
  isTemplateMode,
  isOwner = true,
  collaborationOptions,
  ref,
}: Required<Pick<EditorProps, 'collaborationOptions'>> & Omit<EditorProps, 'collaborationOptions'>) {
  const { setContent, isSaving, isDirty, lastSaved, setCollaborative } = useEditorStore();
  const { provider, doc, awareness, cursorData } = collaborationOptions;
  const isBoundRef = useRef(false);

  const plugins = useMemo(
    () => [
      ...editorPlugins,
      YjsPlugin.configure({
        options: {
          // Use the SAME Y.Doc and Awareness as the provider — without this,
          // the plugin creates its own, causing a Slate/Y.Doc tree mismatch.
          ydoc: doc,
          awareness,
          providers: [provider],
          cursors: {
            data: cursorData,
            autoSend: true,
          },
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider]
  );

  const editor = usePlateEditor({
    plugins,
    // Do NOT pass value here — the YjsPlugin's init() seeds the Y.Doc and
    // syncs it to Slate. Passing value would create a mismatch between the
    // Slate tree and Y.Doc tree, causing "Path doesn't match yText" errors.
    override: { components: COMPONENT_OVERRIDES },
  });

  // Expose imperative handle so parent can apply template content through Slate
  // transforms, which flow through the Y.Doc to all collaborators.
  useImperativeHandle(ref, () => ({
    applyContent: (content: Value, mode: 'replace' | 'prepend') => {
      if (mode === 'replace') {
        for (let i = editor.children.length - 1; i >= 0; i--) {
          editor.tf.removeNodes({ at: [i] })
        }
        editor.tf.insertNodes(content, { at: [0] })
      } else {
        // Prepend: insert template content before existing content
        editor.tf.insertNodes(content, { at: [0] })
      }
    },
  }), [editor])

  // Keep Zustand store in sync so auto-save can read current content,
  // and manually send cursor position via awareness.
  // withCursors' autoSend wraps editor.onChange inside connect(), but
  // that wrapped onChange may not fire reliably due to CJS/ESM dual-package
  // hazard with @slate-yjs/core. Sending manually here guarantees it works.
  const handleChange = useCallback(
    (value: { value: Value }) => {
      setContent(value.value);

      const sharedRoot = doc.get('content', Y.XmlText)
      if (editor.selection) {
        try {
          const relRange = slateRangeToRelativeRange(sharedRoot, editor, editor.selection)
          awareness.setLocalStateField('selection', relRange)
        } catch {
          // Selection may be invalid during editor transitions
        }
      } else {
        awareness.setLocalStateField('selection', null)
      }
    },
    [setContent, editor, doc, awareness]
  );

  // Mark collaborative mode in store
  useEffect(() => {
    setCollaborative(true);
    return () => setCollaborative(false);
  }, [setCollaborative]);

  // Seed Y.Doc and bind editor synchronously.
  // Provider connect/disconnect is handled by useCollaboration.
  //
  // Uses a fixed clientID (0) for seeding so every peer produces identical Yjs
  // structs — when a second peer's seed arrives, Yjs sees the same (client, clock)
  // pairs and skips them, preventing content duplication.
  // If sharedType already has content (peer synced before mount), skip seeding.
  useEffect(() => {
    const sharedType = doc.get('content', Y.XmlText)
    if (sharedType.length === 0) {
      const content = initialContent || initialEditorValue
      const realClientID = doc.clientID
      doc.clientID = 0
      doc.transact(() => {
        sharedType.applyDelta(slateNodesToInsertDelta(content))
      })
      doc.clientID = realClientID
    }

    // Bind editor to Y.Doc (syncs Y.Doc content into Slate)
    const yjsEd = toYjsEditor(editor)
    if (!YjsEditor.connected(yjsEd)) {
      YjsEditor.connect(yjsEd)
    }

    awareness.setLocalStateField('data', cursorData)
    isBoundRef.current = true
    // Clear false-positive dirty flag from Y.Doc seeding onChange
    useEditorStore.getState().markClean()

    return () => {
      const yjsEd = toYjsEditor(editor)
      if (YjsEditor.connected(yjsEd)) {
        YjsEditor.disconnect(yjsEd)
      }
      isBoundRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, doc]);

  // Collaborative auto-save: listen to Y.Doc updates and debounce persistence
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const awarenessRef = useRef(awareness);
  const editorRef = useRef(editor);
  onSaveRef.current = onSave;
  awarenessRef.current = awareness;
  editorRef.current = editor;

  const doSave = useCallback(async () => {
    if (!onSaveRef.current || readOnly) return;
    // Don't save before the editor is bound to Y.Doc
    if (!isBoundRef.current) return;
    hasPendingRef.current = false;

    // Leader election: only the peer with lowest clientID saves
    const aw = awarenessRef.current;
    const states = aw.getStates();
    let lowestClient = aw.clientID;
    states.forEach((_state, clientId) => {
      if (clientId < lowestClient) lowestClient = clientId;
    });
    if (lowestClient !== aw.clientID) return;

    const { setSaving, setLastSaved } = useEditorStore.getState();
    setSaving(true);
    try {
      await onSaveRef.current(editorRef.current.children);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Collaborative auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [readOnly]);

  useEffect(() => {
    if (!onSave || readOnly) return;

    const handler = () => {
      hasPendingRef.current = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(doSave, 3000);
    };

    doc.on('update', handler);
    return () => {
      doc.off('update', handler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // Force-save on unmount — skip leader election (we're leaving, save what we have)
      const { isDirty, content } = useEditorStore.getState();
      if (isDirty && onSaveRef.current) {
        onSaveRef.current(content).catch((err: unknown) => {
          console.error('Collaborative unmount save failed:', err);
        });
      }
    };
  }, [doc, onSave, readOnly, doSave]);

  return (
    <EditorModeContext value={{ isTemplateMode: isTemplateMode ?? false, isOwner }}>
      <DndProvider backend={HTML5Backend}>
        <div className="relative min-h-[200px]">
          <Plate editor={editor} onChange={handleChange}>
            <PlateContent
              readOnly={readOnly}
              placeholder={placeholder}
              className="prose prose-sm max-w-none min-h-[200px] outline-none dark:prose-invert"
            />
            <RemoteCursorOverlay awareness={awareness} doc={doc} />
          </Plate>

          {onSave && (
            <div className="absolute right-2 top-2 text-xs text-gray-400">
              {isSaving ? 'Saving...' : isDirty ? 'Edited' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : null}
            </div>
          )}
        </div>
      </DndProvider>
    </EditorModeContext>
  );
}

export function Editor(props: EditorProps) {
  if (props.collaborationOptions) {
    return (
      <CollaborativeEditor
        {...props}
        collaborationOptions={props.collaborationOptions}
      />
    );
  }
  return <SoloEditor {...props} />;
}
