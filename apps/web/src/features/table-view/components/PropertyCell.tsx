'use client'

import { CheckIcon, MinusIcon } from 'lucide-react'
import type { FieldType } from '@/shared/lib/data'
import { isSafeUrl } from '@/shared/lib/url'

interface PropertyCellProps {
  value: unknown
  fieldType: FieldType
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function PropertyCell({ value, fieldType }: PropertyCellProps) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted-foreground/40">—</span>
  }

  switch (fieldType) {
    case 'text':
      return <span className="truncate">{String(value)}</span>

    case 'number':
      return (
        <span className="tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : String(value)}
        </span>
      )

    case 'date': {
      const date = new Date(String(value))
      if (isNaN(date.getTime())) return <span>{String(value)}</span>
      return <span>{dateFormatter.format(date)}</span>
    }

    case 'checkbox':
      return value ? (
        <CheckIcon className="size-4 text-foreground" />
      ) : (
        <MinusIcon className="size-4 text-muted-foreground/40" />
      )

    case 'select':
      return (
        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
          {String(value)}
        </span>
      )

    case 'multi_select': {
      const items = Array.isArray(value) ? value : [value]
      return (
        <span className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span key={i} className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs">
              {String(item)}
            </span>
          ))}
        </span>
      )
    }

    case 'url': {
      const url = String(value)
      const display = url.replace(/^https?:\/\//, '').slice(0, 40)
      const safe = isSafeUrl(url)
      return (
        <a
          href={safe ? url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={safe ? 'text-primary hover:underline' : 'text-muted-foreground'}
          onClick={(e) => e.stopPropagation()}
        >
          {display}
          {url.replace(/^https?:\/\//, '').length > 40 ? '…' : ''}
        </a>
      )
    }

    default:
      return <span>{String(value)}</span>
  }
}
