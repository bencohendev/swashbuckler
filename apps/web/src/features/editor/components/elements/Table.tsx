'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { type TElement, NodeApi } from '@udecode/plate';
import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement, useEditorRef, useReadOnly } from '@udecode/plate/react';
import {
  insertTableRow,
  insertTableColumn,
  deleteRow,
  deleteColumn,
  deleteTable,
} from '@udecode/plate-table';
import {
  TableProvider,
  useTableColSizes,
  useTableCellElement,
  useTableCellElementResizable,
} from '@udecode/plate-table/react';
import { ResizeHandle } from '@udecode/plate-resizable';
import { Paintbrush, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from '@/shared/components/ui/DropdownMenu';

type TableEditor = Parameters<typeof insertTableRow>[0];

/** After a column insert, colSizes gets a 0 for the new column. Replace it
 *  with the average of existing widths so it's visible. */
function fixZeroColSizes(editor: TableEditor, tablePath: number[]) {
  const node = NodeApi.get(editor, tablePath) as Record<string, unknown> | undefined;
  const sizes = node?.colSizes as number[] | undefined;
  if (!sizes || !sizes.some((s) => s === 0)) return;
  const avg = 150; // fixed width for new columns
  editor.tf.setNodes(
    { colSizes: sizes.map((s) => (s === 0 ? avg : s)) } as Record<string, unknown>,
    { at: tablePath },
  );
}

interface RowPosition {
  top: number;
  height: number;
}

interface ColPosition {
  left: number;
  width: number;
}

interface TableElementNode {
  children: { type: string; children: { type: string }[] }[];
  [key: string]: unknown;
}

function stripIds(node: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...node };
  delete clone.id;
  if (Array.isArray(clone.children)) {
    clone.children = (clone.children as Record<string, unknown>[]).map(
      stripIds,
    );
  }
  return clone;
}

const BACKGROUND_COLORS = [
  { label: 'Light Gray', value: '#f1f1ef' },
  { label: 'Light Brown', value: '#f4eeee' },
  { label: 'Light Orange', value: '#faebdd' },
  { label: 'Light Yellow', value: '#fbf3db' },
  { label: 'Light Green', value: '#ddedea' },
  { label: 'Light Blue', value: '#ddebf1' },
  { label: 'Light Purple', value: '#eae4f2' },
  { label: 'Light Pink', value: '#f4dfeb' },
  { label: 'Light Red', value: '#fbe4e4' },
  { label: 'Light Teal', value: '#d3e5ef' },
];

const TEXT_COLORS = [
  { label: 'Gray', value: '#787774' },
  { label: 'Brown', value: '#9f6b53' },
  { label: 'Orange', value: '#d9730d' },
  { label: 'Yellow', value: '#cb912f' },
  { label: 'Green', value: '#448361' },
  { label: 'Blue', value: '#337ea9' },
  { label: 'Purple', value: '#9065b0' },
  { label: 'Pink', value: '#c14c8a' },
  { label: 'Red', value: '#d44c47' },
  { label: 'Teal', value: '#2b6e99' },
];

function ColorPaletteSubmenu({
  cellPaths,
  editor,
  currentBackground,
  currentColor,
}: {
  cellPaths: number[][];
  editor: TableEditor;
  currentBackground?: string;
  currentColor?: string;
}) {
  const applyBackground = (value: string | undefined) => {
    for (const path of cellPaths) {
      editor.tf.setNodes({ background: value ?? null } as Record<string, unknown>, { at: path });
    }
  };

  const applyColor = (value: string | undefined) => {
    for (const path of cellPaths) {
      editor.tf.setNodes({ color: value ?? null } as Record<string, unknown>, { at: path });
    }
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Paintbrush className="size-4" />
        Color
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-[220px]">
        <DropdownMenuLabel>Background</DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-1 px-2 pb-1">
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded border border-border"
            aria-label="Default background"
            onClick={() => applyBackground(undefined)}
          >
            {!currentBackground && <Check className="size-3 text-muted-foreground" />}
          </button>
          {BACKGROUND_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className="flex size-6 items-center justify-center rounded border border-border"
              style={{ backgroundColor: c.value }}
              aria-label={c.label}
              onClick={() => applyBackground(c.value)}
            >
              {currentBackground === c.value && <Check className="size-3" />}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Text color</DropdownMenuLabel>
        <div className="grid grid-cols-5 gap-1 px-2 pb-1">
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded border border-border"
            aria-label="Default text color"
            onClick={() => applyColor(undefined)}
          >
            {!currentColor && <Check className="size-3 text-muted-foreground" />}
          </button>
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className="flex size-6 items-center justify-center rounded border border-border"
              style={{ backgroundColor: c.value }}
              aria-label={c.label}
              onClick={() => applyColor(c.value)}
            >
              {currentColor === c.value && <Check className="size-3 text-white" />}
            </button>
          ))}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function RowHandleMenu({
  rowIndex,
  tablePath,
  editor,
  element,
  onOpenChange,
}: {
  rowIndex: number;
  tablePath: number[];
  editor: TableEditor;
  element: TableElementNode;
  onOpenChange: (open: boolean) => void;
}) {
  const row = element.children[rowIndex];
  const cellCount = row?.children.length ?? 0;
  const isFirstRow = rowIndex === 0;
  const isHeaderRow =
    isFirstRow && row?.children.every((cell) => cell.type === 'th');

  const cellPaths = Array.from({ length: cellCount }, (_, i) => [
    ...tablePath,
    rowIndex,
    i,
  ]);

  const firstCell = row?.children[0] as Record<string, unknown> | undefined;

  const toggleHeaderRow = () => {
    const newType = isHeaderRow ? 'td' : 'th';
    for (const path of cellPaths) {
      editor.tf.setNodes({ type: newType } as Record<string, unknown>, { at: path });
    }
  };

  const duplicateRow = () => {
    const rowNode = element.children[rowIndex];
    if (!rowNode) return;
    const cloned = stripIds(
      JSON.parse(JSON.stringify(rowNode)) as Record<string, unknown>,
    );
    editor.tf.insertNodes(cloned as TElement, {
      at: [...tablePath, rowIndex + 1],
    });
  };

  const clearContents = () => {
    for (const path of cellPaths) {
      const cell = editor.api.node(path);
      if (!cell) continue;
      const [cellNode] = cell;
      const cellChildren = (cellNode as Record<string, unknown>)
        .children as unknown[];
      for (let j = cellChildren.length - 1; j >= 0; j--) {
        editor.tf.removeNodes({ at: [...path, j] });
      }
      editor.tf.insertNodes(
        { type: 'p', children: [{ text: '' }] } as TElement,
        { at: [...path, 0] },
      );
    }
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group/row-handle flex h-full w-5 items-center justify-center"
          aria-label={`Row ${rowIndex + 1} options`}
        >
          <div className="h-full w-0.5 rounded-full bg-primary/40 transition-colors group-hover/row-handle:bg-primary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="left">
        {isFirstRow && (
          <DropdownMenuCheckboxItem
            checked={isHeaderRow}
            onSelect={toggleHeaderRow}
          >
            Header row
          </DropdownMenuCheckboxItem>
        )}
        <ColorPaletteSubmenu
          cellPaths={cellPaths}
          editor={editor}
          currentBackground={(firstCell?.background as string) ?? undefined}
          currentColor={(firstCell?.color as string) ?? undefined}
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            insertTableRow(editor, {
              fromRow: [...tablePath, rowIndex],
              before: true,
            });
          }}
        >
          Insert above
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            insertTableRow(editor, {
              fromRow: [...tablePath, rowIndex],
            });
          }}
        >
          Insert below
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={duplicateRow}>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={clearContents}>
          Clear contents
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
  element,
  onOpenChange,
}: {
  colIndex: number;
  tablePath: number[];
  editor: TableEditor;
  element: TableElementNode;
  onOpenChange: (open: boolean) => void;
}) {
  const rows = element.children;
  const isFirstCol = colIndex === 0;
  const isHeaderCol =
    isFirstCol &&
    rows.every((row) => row.children[0]?.type === 'th');

  const cellPaths = rows.map((_, rowIdx) => [
    ...tablePath,
    rowIdx,
    colIndex,
  ]);

  const firstCell = rows[0]?.children[colIndex] as Record<string, unknown> | undefined;

  const toggleHeaderCol = () => {
    const newType = isHeaderCol ? 'td' : 'th';
    for (const path of cellPaths) {
      editor.tf.setNodes({ type: newType } as Record<string, unknown>, { at: path });
    }
  };

  const duplicateColumn = () => {
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const cellNode = rows[rowIdx]?.children[colIndex];
      if (!cellNode) continue;
      const cloned = stripIds(
        JSON.parse(JSON.stringify(cellNode)) as Record<string, unknown>,
      );
      editor.tf.insertNodes(cloned as TElement, {
        at: [...tablePath, rowIdx, colIndex + 1],
      });
    }
  };

  const clearContents = () => {
    for (const path of cellPaths) {
      const cell = editor.api.node(path);
      if (!cell) continue;
      const [cellNode] = cell;
      const cellChildren = (cellNode as Record<string, unknown>)
        .children as unknown[];
      for (let j = cellChildren.length - 1; j >= 0; j--) {
        editor.tf.removeNodes({ at: [...path, j] });
      }
      editor.tf.insertNodes(
        { type: 'p', children: [{ text: '' }] } as TElement,
        { at: [...path, 0] },
      );
    }
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group/col-handle flex w-full h-5 items-center justify-center"
          aria-label={`Column ${colIndex + 1} options`}
        >
          <div className="w-full h-0.5 rounded-full bg-primary/40 transition-colors group-hover/col-handle:bg-primary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {isFirstCol && (
          <DropdownMenuCheckboxItem
            checked={isHeaderCol}
            onSelect={toggleHeaderCol}
          >
            Header column
          </DropdownMenuCheckboxItem>
        )}
        <ColorPaletteSubmenu
          cellPaths={cellPaths}
          editor={editor}
          currentBackground={(firstCell?.background as string) ?? undefined}
          currentColor={(firstCell?.color as string) ?? undefined}
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            const cellPath = [...tablePath, 0, colIndex];
            editor.tf.select(editor.api.start(cellPath));
            insertTableColumn(editor, { before: true });
            fixZeroColSizes(editor, tablePath);
          }}
        >
          Insert left
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            const cellPath = [...tablePath, 0, colIndex];
            editor.tf.select(editor.api.start(cellPath));
            insertTableColumn(editor);
            fixZeroColSizes(editor, tablePath);
          }}
        >
          Insert right
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={duplicateColumn}>
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={clearContents}>
          Clear contents
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

function TableColGroup() {
  const colSizes = useTableColSizes();

  return (
    <colgroup>
      {colSizes.map((width, i) => (
        <col key={i} style={width ? { width } : undefined} />
      ))}
    </colgroup>
  );
}

function CellResizeHandle() {
  const { colIndex, colSpan, rowIndex } = useTableCellElement();
  const colSizes = useTableColSizes({ disableOverrides: true });
  const { rightProps } = useTableCellElementResizable({
    colIndex,
    colSpan,
    rowIndex,
  });

  // Override initialSize with the stored colSize so it matches the value
  // handleResizeRight reads from colSizesWithoutOverridesRef. Without this,
  // the fallback DOM measurement (offsetWidth, integer) mismatches the stored
  // float value, causing the divider to not track the cursor exactly.
  const adjustedRightProps = useMemo(() => ({
    ...rightProps,
    options: {
      ...rightProps.options,
      initialSize: colSizes[colIndex] || undefined,
    },
  }), [rightProps, colSizes, colIndex]);

  return (
    <ResizeHandle
      {...adjustedRightProps}
      className="group/resize absolute -right-1 top-0 z-20 flex h-full w-2 cursor-col-resize select-none items-center justify-center"
      contentEditable={false}
    >
      <div className="pointer-events-none h-full w-[3px] rounded-full bg-primary opacity-0 transition-opacity group-hover/resize:opacity-100" />
    </ResizeHandle>
  );
}

function TableElementContent({
  children,
  tablePath,
  element,
}: {
  children: React.ReactNode;
  tablePath: number[];
  element: PlateElementProps['element'];
}) {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const tableRef = useRef<HTMLTableElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [menuAnchorCell, setMenuAnchorCell] = useState<{ row: number; col: number } | null>(null);
  const [rowPositions, setRowPositions] = useState<RowPosition[]>([]);
  const [colPositions, setColPositions] = useState<ColPosition[]>([]);

  // Seed colSizes from actual DOM measurements when the table lacks them.
  // This avoids the "jump on first drag" bug caused by initialTableWidth
  // seeding pixel values that don't match the actual rendered width.
  const colSizes = (element as unknown as { colSizes?: number[] }).colSizes;
  const hasColSizes = colSizes && colSizes.length > 0 && colSizes.some((s) => s > 0);
  useEffect(() => {
    if (hasColSizes) return;
    const table = tableRef.current;
    if (!table) return;

    const firstRowCells = table.querySelectorAll('tr:first-child > td, tr:first-child > th');
    if (firstRowCells.length === 0) return;

    const measuredSizes = Array.from(firstRowCells).map((cell) => cell.getBoundingClientRect().width);
    editor.tf.setNodes({ colSizes: measuredSizes } as Record<string, unknown>, { at: tablePath });
  }, [hasColSizes, editor, tablePath]);

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

  const activeCell = menuAnchorCell ?? hoveredCell;

  const tableElement = element as unknown as TableElementNode;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const row = rowPositions.findIndex(
        (r) => y >= r.top && y < r.top + r.height,
      );
      const col = colPositions.findIndex(
        (c) => x >= c.left && x < c.left + c.width,
      );
      if (row >= 0 && col >= 0) {
        setHoveredCell((prev) =>
          prev?.row === row && prev?.col === col ? prev : { row, col },
        );
      }
    },
    [rowPositions, colPositions],
  );

  return (
    <div
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredCell(null)}
    >
        {/* Column handles — zero-height strip on top border */}
        {!readOnly && tablePath && (
          <div
            contentEditable={false}
            className="absolute left-0 right-0 top-0 z-10 h-0"
          >
            {colPositions.map((col, i) => {
              const visible = activeCell?.col === i;
              return (
                <div
                  key={i}
                  className={`absolute transition-opacity duration-150 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  style={{
                    left: col.left,
                    width: col.width,
                    transform: 'translateY(-50%)',
                  }}
                >
                  <ColumnHandleMenu
                    colIndex={i}
                    tablePath={tablePath}
                    editor={editor}
                    element={tableElement}
                    onOpenChange={(open) => {
                      if (open) setMenuAnchorCell({ row: -1, col: i });
                      else setMenuAnchorCell(null);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Row handles — zero-width strip on left border */}
        {!readOnly && tablePath && (
          <div
            contentEditable={false}
            className="absolute left-0 top-0 bottom-0 z-10 w-0"
          >
            {rowPositions.map((row, i) => {
              const visible = activeCell?.row === i;
              return (
                <div
                  key={i}
                  className={`absolute transition-opacity duration-150 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                  style={{
                    top: row.top,
                    height: row.height,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <RowHandleMenu
                    rowIndex={i}
                    tablePath={tablePath}
                    editor={editor}
                    element={tableElement}
                    onOpenChange={(open) => {
                      if (open) setMenuAnchorCell({ row: i, col: -1 });
                      else setMenuAnchorCell(null);
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        <table
          ref={tableRef}
          className="border-collapse border border-gray-200 dark:border-gray-700"
          style={{
            tableLayout: 'fixed',
            width: hasColSizes
              ? colSizes!.reduce((a, b) => a + b, 0)
              : '100%',
          }}
        >
          <TableColGroup />
          <tbody>{children}</tbody>
        </table>
    </div>
  );
}

export function TableElement({
  element,
  children,
  ...props
}: PlateElementProps) {
  const editor = useEditorRef();
  const tablePath = editor.api.findPath(element);

  // Always render PlateElement so its internal hooks run on every render.
  // Returning null before PlateElement would violate rules of hooks when
  // findPath alternates between null and a valid path across renders.
  return (
    <PlateElement {...props} element={element} className="my-4">
      {tablePath ? (
        <TableProvider>
          <TableElementContent tablePath={tablePath} element={element}>
            {children}
          </TableElementContent>
        </TableProvider>
      ) : (
        <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
          <tbody>{children}</tbody>
        </table>
      )}
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
  const readOnly = useReadOnly();
  const { colIndex } = useTableCellElement();
  const cellElement = props.element as unknown as {
    background?: string;
    color?: string;
  };
  const style: React.CSSProperties = {};
  if (cellElement.background) style.backgroundColor = cellElement.background;
  if (cellElement.color) style.color = cellElement.color;

  const isFirstCol = colIndex === 0 && !readOnly;

  return (
    <PlateElement
      {...props}
      as="td"
      className={`relative border border-gray-200 p-2 dark:border-gray-700 ${isFirstCol ? 'pl-5' : ''}`}
      style={style}
    >
      {props.children}
      {!readOnly && <CellResizeHandle />}
    </PlateElement>
  );
}

export function TableHeaderCellElement(props: PlateElementProps) {
  const readOnly = useReadOnly();
  const { colIndex } = useTableCellElement();
  const cellElement = props.element as unknown as {
    background?: string;
    color?: string;
  };
  const style: React.CSSProperties = {};
  if (cellElement.background) style.backgroundColor = cellElement.background;
  if (cellElement.color) style.color = cellElement.color;

  const isFirstCol = colIndex === 0 && !readOnly;

  return (
    <PlateElement
      {...props}
      as="th"
      className={`relative border border-gray-200 bg-gray-50 p-2 font-semibold dark:border-gray-700 dark:bg-gray-800 ${isFirstCol ? 'pl-5' : ''}`}
      style={style}
    >
      {props.children}
      {!readOnly && <CellResizeHandle />}
    </PlateElement>
  );
}
