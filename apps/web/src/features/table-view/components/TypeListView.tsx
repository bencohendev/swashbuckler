'use client'

import { useRouter } from 'next/navigation'
import type { DataObjectSummary, ObjectType } from '@/shared/lib/data'

interface TypeListViewProps {
  type?: ObjectType
  objects: DataObjectSummary[]
  emptyMessage?: string
}

export function TypeListView({ type, objects, emptyMessage }: TypeListViewProps) {
  const router = useRouter()

  if (objects.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {emptyMessage ?? `No ${type?.plural_name.toLowerCase() ?? 'items'} yet`}
      </div>
    )
  }

  return (
    <div className="divide-y rounded-lg border">
      {objects.map((obj) => (
          <button
            key={obj.id}
            onClick={() => router.push(`/objects/${obj.id}`)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50"
          >
            {obj.icon && <span className="shrink-0">{obj.icon}</span>}
            <span className="truncate font-medium">{obj.title}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
              {new Date(obj.updated_at).toLocaleDateString()}
            </span>
          </button>
      ))}
    </div>
  )
}
