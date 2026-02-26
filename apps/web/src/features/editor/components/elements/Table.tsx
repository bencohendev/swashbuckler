'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement, useEditorRef, useReadOnly } from '@udecode/plate/react';
import {
  insertTableRow,
  insertTableColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
} from '@udecode/plate-table';
import { GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/components/ui/DropdownMenu';

type TableEditor = Parameters<typeof insertTableRow>[0];

interface RowPosition {
  top: number;
  height: number;
}

interface ColPosition {
  left: number;
  width: number;
}

function RowHandleMenu({
  rowIndex,
  tablePath,
  editor,
  onOpenChange,
}: {
  rowIndex: number;
  tablePath: number[];
  editor: TableEditor;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-6 items-center justify-center rounded bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
          aria-label={`Row ${rowIndex + 1} options`}
        >
          <GripVertical className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="left">
        <DropdownMenuItem
          onSelect={() => {
            insertTableRow(editor, {
              at: [...tablePath, rowIndex],
              before: true,
            });
          }}
        >
          Insert row above
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            insertTableRow(editor, { at: [...tablePath, rowIndex] });
          }}
        >
          Insert row below
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            const cellPath = [...tablePath, rowIndex, 0];
            editor.tf.select(editor.api.start(cellPath));
            deleteRow(editor);
          }}
        >
          Delete row
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => deleteTable(editor)}
        >
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColumnHandleMenu({
  colIndex,
  tablePath,
  editor,
  onOpenChange,
}: {
  colIndex: number;
  tablePath: number[];
  editor: TableEditor;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-6 items-center justify-center rounded bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background"
          aria-label={`Column ${colIndex + 1} options`}
        >
          <GripVertical className="size-3.5 rotate-90 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onSelect={() => {
            insertTableColumn(editor, {
              at: [...tablePath, 0, colIndex],
              before: true,
            });
          }}
        >
          Insert column left
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            insertTableColumn(editor, {
              at: [...tablePath, 0, colIndex],
            });
          }}
        >
          Insert column right
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            const cellPath = [...tablePath, 0, colIndex];
            editor.tf.select(editor.api.start(cellPath));
            deleteColumn(editor);
          }}
        >
          Delete column
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => deleteTable(editor)}
        >
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TableElement({
  element,
  children,
  ...props
}: PlateElementProps) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const tableRef = useRef<HTMLTableElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [openMenuCount, setOpenMenuCount] = useState(0);
  const [rowPositions, setRowPositions] = useState<RowPosition[]>([]);
  const [colPositions, setColPositions] = useState<ColPosition[]>([]);

  const tablePath = editor.api.findPath(element);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const measure = () => {
      const tableRect = table.getBoundingClientRect();

      const rows = table.querySelectorAll('tr');
      const newRowPositions: RowPosition[] = Array.from(rows).map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          top: rect.top - tableRect.top,
          height: rect.height,
        };
      });

      const firstRowCells = rows[0]?.querySelectorAll('td, th') ?? [];
      const newColPositions: ColPosition[] = Array.from(firstRowCells).map(
        (cell) => {
          const rect = cell.getBoundingClientRect();
          return {
            left: rect.left - tableRect.left,
            width: rect.width,
          };
        },
      );

      setRowPositions(newRowPositions);
      setColPositions(newColPositions);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);

    return () => observer.disconnect();
  }, []);

  const handleMenuOpenChange = useCallback((open: boolean) => {
    setOpenMenuCount((prev) => (open ? prev + 1 : prev - 1));
  }, []);

  const showHandles = !readOnly && (isHovered || openMenuCount > 0);

  return (
    <PlateElement {...props} element={element} className="my-4">
      <div
        className="relative -ml-[30px] -mt-[28px] pl-[30px] pt-[28px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!readOnly && tablePath && (
          <div
            contentEditable={false}
            className={`absolute left-[30px] right-0 top-0 h-[28px] transition-opacity duration-150 ${showHandles ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            {colPositions.map((col, i) => (
              <div
                key={i}
                className="absolute"
                style={{ left: col.left + col.width / 2 - 12 }}
              >
                <ColumnHandleMenu
                  colIndex={i}
                  tablePath={tablePath}
                  editor={editor}
                  onOpenChange={handleMenuOpenChange}
                />
              </div>
            ))}
          </div>
        )}

        {!readOnly && tablePath && (
          <div
            contentEditable={false}
            className={`absolute left-0 top-[28px] bottom-0 w-[30px] transition-opacity duration-150 ${showHandles ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            {rowPositions.map((row, i) => (
              <div
                key={i}
                className="absolute"
                style={{ top: row.top + row.height / 2 - 12 }}
              >
                <RowHandleMenu
                  rowIndex={i}
                  tablePath={tablePath}
                  editor={editor}
                  onOpenChange={handleMenuOpenChange}
                />
              </div>
            ))}
          </div>
        )}

        <table
          ref={tableRef}
          className="w-full border-collapse border border-gray-200 dark:border-gray-700"
        >
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
