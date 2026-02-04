'use client';

import { useCallback } from 'react';
import { Plate, PlateContent, usePlateEditor } from '@udecode/plate/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Value } from '@udecode/plate';
import { editorPlugins, initialEditorValue } from '../lib/plate-config';
import { useEditorStore } from '../store';
import { useAutoSave } from '../hooks/useAutoSave';

interface EditorProps {
  initialContent?: Value;
  onSave?: (content: Value) => Promise<void>;
  readOnly?: boolean;
  placeholder?: string;
}

export function Editor({
  initialContent,
  onSave,
  readOnly = false,
  placeholder = 'Start writing...',
}: EditorProps) {
  const { setContent, isSaving, lastSaved } = useEditorStore();

  const editorValue = initialContent || initialEditorValue;

  // Create editor with plugins
  const editor = usePlateEditor({
    plugins: editorPlugins,
    value: editorValue,
  });

  // Handle content changes
  const handleChange = useCallback(
    (value: { value: Value }) => {
      setContent(value.value);
    },
    [setContent]
  );

  // Auto-save hook
  useAutoSave({
    onSave: onSave || (async () => {}),
    enabled: !!onSave && !readOnly,
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="relative min-h-[200px]">
        <Plate
          editor={editor}
          onChange={handleChange}
        >
          <PlateContent
            readOnly={readOnly}
            placeholder={placeholder}
            className="prose prose-sm max-w-none min-h-[200px] outline-none dark:prose-invert"
          />
        </Plate>

        {/* Save status indicator */}
        {onSave && (
          <div className="absolute right-2 top-2 text-xs text-gray-400">
            {isSaving ? (
              'Saving...'
            ) : lastSaved ? (
              `Saved ${lastSaved.toLocaleTimeString()}`
            ) : null}
          </div>
        )}
      </div>
    </DndProvider>
  );
}
