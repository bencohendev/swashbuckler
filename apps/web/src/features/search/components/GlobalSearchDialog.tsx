'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, TagIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { cn } from '@/shared/lib/utils'
import { useObjectTypes } from '@/features/object-types/hooks/useObjectTypes'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { useGlobalSearch } from '../hooks/useGlobalSearch'

interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter()
  const { types } = useObjectTypes()
  const { query, setQuery, typeIds, setTypeIds, results, tagResults, isLoading } = useGlobalSearch()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Exclude results whose type is archived
  const archivedTypeIds = useMemo(() => new Set(types.filter(t => t.is_archived).map(t => t.id)), [types])
  const visibleResults = useMemo(() => results.filter(r => !archivedTypeIds.has(r.type_id)), [results, archivedTypeIds])

  const totalItems = tagResults.length + visibleResults.length

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setTypeIds([])
      setSelectedIndex(0) // eslint-disable-line react-hooks/set-state-in-effect -- reset on dialog open
    }
  }, [open, setQuery, setTypeIds])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0) // eslint-disable-line react-hooks/set-state-in-effect -- reset on data change
  }, [visibleResults, tagResults])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const navigateTo = useCallback((path: string) => {
    onOpenChange(false)
    router.push(path)
  }, [onOpenChange, router])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Tags come first, then objects
      if (selectedIndex < tagResults.length) {
        const tag = tagResults[selectedIndex]
        navigateTo(`/tags/${encodeURIComponent(tag.name)}`)
      } else {
        const obj = results[selectedIndex - tagResults.length]
        if (obj) navigateTo(`/objects/${obj.id}`)
      }
    }
  }

  function toggleTypeFilter(typeId: string) {
    setTypeIds(
      typeIds.includes(typeId)
        ? typeIds.filter(id => id !== typeId)
        : [...typeIds, typeId]
    )
  }

  const typeMap = new Map(types.map(t => [t.id, t]))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[10%] translate-y-0 gap-0 p-0 sm:max-w-lg md:top-[20%]"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="text-muted-foreground size-4 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search entries..."
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {isLoading && (
            <div role="status" aria-label="Searching" className="size-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          )}
        </div>

        {types.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
            {types.filter(t => !t.is_archived).map(type => (
              <button
                key={type.id}
                onClick={() => toggleTypeFilter(type.id)}
                aria-pressed={typeIds.includes(type.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                  typeIds.includes(type.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <TypeIcon icon={type.icon} className="size-3" />
                {type.plural_name}
              </button>
            ))}
          </div>
        )}

        <div ref={listRef} role="listbox" aria-label="Search results" className="max-h-72 overflow-y-auto">
          {query.trim() && totalItems === 0 && !isLoading && (
            <div role="status" className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}

          {!query.trim() && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Type to search...
            </div>
          )}

          {tagResults.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Tags</div>
              {tagResults.map((tag, index) => (
                <button
                  key={tag.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  data-selected={index === selectedIndex}
                  onClick={() => navigateTo(`/tags/${encodeURIComponent(tag.name)}`)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                >
                  <TagIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={tag.color ? { color: tag.color } : undefined}
                  >
                    {tag.name}
                  </span>
                </button>
              ))}
            </>
          )}

          {visibleResults.length > 0 && (
            <>
              {tagResults.length > 0 && (
                <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Entries</div>
              )}
              {visibleResults.map((obj, index) => {
                const objType = typeMap.get(obj.type_id)
                const globalIndex = tagResults.length + index
                return (
                  <button
                    key={obj.id}
                    role="option"
                    aria-selected={globalIndex === selectedIndex}
                    data-selected={globalIndex === selectedIndex}
                    onClick={() => navigateTo(`/objects/${obj.id}`)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      globalIndex === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                    )}
                  >
                    {objType && (
                      <TypeIcon icon={objType.icon} className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{obj.title}</span>
                    {objType && (
                      <span className="shrink-0 text-xs text-muted-foreground">{objType.name}</span>
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
