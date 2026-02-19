'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from './elements';
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

export const EditorModeContext = createContext<{ isTemplateMode: boolean }>({ isTemplateMode: false });

export interface CollaborationOptions {
  provider: SupabaseYjsProvider
  doc: Y.Doc
  awareness: Awareness
  cursorData: { name: string; color: string; avatarUrl?: string }
}

interface EditorProps {
  initialContent?: Value;
  onSave?: (content: Value) => Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
  isTemplateMode?: boolean;
  collaborationOptions?: CollaborationOptions;
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
}: Omit<EditorProps, 'collaborationOptions'>) {
  const { setContent, isSaving, lastSaved } = useEditorStore();
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

  return (
    <EditorModeContext value={{ isTemplateMode: isTemplateMode ?? false }}>
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
              {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : null}
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
  collaborationOptions,
}: Required<Pick<EditorProps, 'collaborationOptions'>> & Omit<EditorProps, 'collaborationOptions'>) {
  const { setContent, isSaving, lastSaved, setCollaborative } = useEditorStore();
  const { provider, doc, awareness, cursorData } = collaborationOptions;
  const [isReady, setIsReady] = useState(false);
  const isReadyRef = useRef(false);

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

  // Connect provider FIRST, then seed Y.Doc and bind editor AFTER sync completes.
  //
  // This prevents content duplication: if we seed a fresh Y.Doc before syncing,
  // the seeded content (under our new clientID) gets merged with a peer's identical
  // content (under their clientID), doubling everything. By deferring the seed until
  // after sync, we only seed if no peer provided content.
  useEffect(() => {
    let cancelled = false;

    const handleSynced = () => {
      if (cancelled) return;

      // Seed Y.Doc only if no peer provided content via sync.
      // Use a fixed clientID (0) so every peer produces identical Yjs structs.
      // When a second peer's seed update arrives, Yjs sees the same (client, clock)
      // pairs and skips them — preventing content duplication.
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
      isReadyRef.current = true;
      setIsReady(true);
    };

    provider.onSync(handleSynced);
    provider.connect();

    return () => {
      cancelled = true;
      provider.offSync(handleSynced);
      provider.disconnect()
      const yjsEd = toYjsEditor(editor)
      if (YjsEditor.connected(yjsEd)) {
        YjsEditor.disconnect(yjsEd)
      }
      isReadyRef.current = false;
      setIsReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, doc, provider]);

  // Collaborative auto-save: listen to Y.Doc updates and debounce persistence
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingRef = useRef(false);

  const doSave = useCallback(async () => {
    if (!onSave || readOnly) return;
    // Don't save before the editor is bound to Y.Doc
    if (!isReadyRef.current) return;
    hasPendingRef.current = false;

    // Leader election: only the peer with lowest clientID saves
    const states = awareness.getStates();
    let lowestClient = awareness.clientID;
    states.forEach((_state, clientId) => {
      if (clientId < lowestClient) lowestClient = clientId;
    });
    if (lowestClient !== awareness.clientID) return;

    const { setSaving, setLastSaved } = useEditorStore.getState();
    setSaving(true);
    try {
      await onSave(editor.children);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Collaborative auto-save failed:', error);
    } finally {
      setSaving(false);
    }
  }, [onSave, readOnly, awareness, editor]);

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
      // Force-save on unmount if pending changes
      if (hasPendingRef.current) doSave();
    };
  }, [doc, onSave, readOnly, doSave]);

  return (
    <EditorModeContext value={{ isTemplateMode: isTemplateMode ?? false }}>
      <DndProvider backend={HTML5Backend}>
        <div className="relative min-h-[200px]">
          <Plate editor={editor} onChange={handleChange}>
            {isReady ? (
              <>
                <PlateContent
                  readOnly={readOnly}
                  placeholder={placeholder}
                  className="prose prose-sm max-w-none min-h-[200px] outline-none dark:prose-invert"
                />
                <RemoteCursorOverlay awareness={awareness} doc={doc} />
              </>
            ) : (
              <div className="min-h-[200px] flex items-center justify-center">
                <span className="text-sm text-muted-foreground animate-pulse">Connecting...</span>
              </div>
            )}
          </Plate>

          {onSave && (
            <div className="absolute right-2 top-2 text-xs text-gray-400">
              {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : null}
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
