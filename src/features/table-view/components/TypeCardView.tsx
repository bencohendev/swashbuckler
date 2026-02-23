'use client'

import { useRouter } from 'next/navigation'
import type { DataObject, ObjectType } from '@/shared/lib/data'
import { extractPlainText } from '../lib/extractPlainText'

interface TypeCardViewProps {
  type: ObjectType
  objects: DataObject[]
}

export function TypeCardView({ type, objects }: TypeCardViewProps) {
  const router = useRouter()

  if (objects.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No {type.plural_name.toLowerCase()} yet
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {objects.map((obj) => {
        const preview = obj.content
          ? extractPlainText(obj.content)
          : ''

        return (
          <button
            key={obj.id}
            onClick={() => router.push(`/objects/${obj.id}`)}
            className="flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-accent/50"
          >
            {obj.cover_image && (
              /* eslint-disable-next-line @next/next/no-img-element -- user-uploaded cover image URL */
              <img
                src={obj.cover_image}
                alt=""
                loading="lazy"
                className="h-32 w-full object-cover"
              />
            )}
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <div className="flex items-center gap-2">
                {obj.icon && <span className="shrink-0">{obj.icon}</span>}
                <span className="truncate font-medium">{obj.title}</span>
              </div>
              {preview && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {preview}
                </p>
              )}
              <p className="mt-auto pt-1.5 text-xs text-muted-foreground">
                {new Date(obj.updated_at).toLocaleDateString()}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
