'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';

export function TableElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="table"
      className="my-4 w-full border-collapse border border-gray-200 dark:border-gray-700"
    />
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
