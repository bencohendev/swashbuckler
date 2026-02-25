'use client';

import { useState, useCallback } from 'react';
import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement, useEditorRef, useReadOnly } from '@udecode/plate/react';
import {
  insertTableRow,
  insertTableColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
} from '@udecode/plate-table';
import { Plus, Trash2, Rows3, Columns3 } from 'lucide-react';

export function TableElement({ element, children, ...props }: PlateElementProps) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const [showToolbar, setShowToolbar] = useState(false);

  const handleInsertRow = useCallback(() => {
    insertTableRow(editor);
  }, [editor]);

  const handleInsertColumn = useCallback(() => {
    insertTableColumn(editor);
  }, [editor]);

  const handleDeleteRow = useCallback(() => {
    deleteRow(editor);
  }, [editor]);

  const handleDeleteColumn = useCallback(() => {
    deleteColumn(editor);
  }, [editor]);

  const handleDeleteTable = useCallback(() => {
    deleteTable(editor);
  }, [editor]);

  return (
    <PlateElement {...props} element={element} className="my-4">
      <div
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        {!readOnly && showToolbar && (
          <div contentEditable={false} className="mb-1 flex justify-end gap-1">
            <button
              type="button"
              onClick={handleInsertRow}
              className="flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-1 text-xs text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
              title="Add row"
            >
              <Plus className="size-3" />
              <Rows3 className="size-3" />
            </button>
            <button
              type="button"
              onClick={handleInsertColumn}
              className="flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-1 text-xs text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
              title="Add column"
            >
              <Plus className="size-3" />
              <Columns3 className="size-3" />
            </button>
            <button
              type="button"
              onClick={handleDeleteRow}
              className="flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-1 text-xs text-destructive shadow-sm backdrop-blur-sm hover:bg-background"
              title="Delete row"
            >
              <Trash2 className="size-3" />
              <Rows3 className="size-3" />
            </button>
            <button
              type="button"
              onClick={handleDeleteColumn}
              className="flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-1 text-xs text-destructive shadow-sm backdrop-blur-sm hover:bg-background"
              title="Delete column"
            >
              <Trash2 className="size-3" />
              <Columns3 className="size-3" />
            </button>
            <button
              type="button"
              onClick={handleDeleteTable}
              className="rounded-md bg-background/80 px-1.5 py-1 text-xs text-destructive shadow-sm backdrop-blur-sm hover:bg-background"
              title="Delete table"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
        <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
          <tbody>{children}</tbody>
        </table>
      </div>
    </PlateElement>
  );
}

export function TableRowElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="tr"
      className="border-b border-gray-200 dark:border-gray-700"
    />
  );
}

export function TableCellElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="td"
      className="border border-gray-200 p-2 dark:border-gray-700"
    />
  );
}

export function TableHeaderCellElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="th"
      className="border border-gray-200 bg-gray-50 p-2 font-semibold dark:border-gray-700 dark:bg-gray-800"
    />
  );
}
