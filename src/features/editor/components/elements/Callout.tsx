'use client';

import type { PlateElementProps } from '@udecode/plate/react';
import { PlateElement } from '@udecode/plate/react';
import { Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

const variants = {
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    iconClassName: 'text-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
    iconClassName: 'text-yellow-500',
  },
  error: {
    icon: AlertCircle,
    className: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    iconClassName: 'text-red-500',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    iconClassName: 'text-green-500',
  },
};

type VariantKey = keyof typeof variants;

function getVariant(element: Record<string, unknown>): VariantKey {
  if ('variant' in element && typeof element.variant === 'string' && element.variant in variants) {
    return element.variant as VariantKey;
  }
  return 'info';
}

export function CalloutElement({ children, element, ...props }: PlateElementProps) {
  const variant = getVariant(element);
  const { icon: Icon, className, iconClassName } = variants[variant];

  return (
    <PlateElement
      {...props}
      element={element}
      className={`my-4 flex items-start gap-3 rounded-lg border p-4 ${className}`}
    >
      <span contentEditable={false}>
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconClassName}`} />
      </span>
      <div className="flex-1">{children}</div>
    </PlateElement>
  );
}
