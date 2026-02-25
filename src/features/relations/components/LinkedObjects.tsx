'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRightIcon, LinkIcon, XIcon, PlusIcon } from 'lucide-react'
import { useObjectRelations } from '../hooks/useObjectRelations'
import { useDataClient, type DataObject } from '@/shared/lib/data'

interface LinkedObjectsProps {
  objectId: string
  readOnly?: boolean
}

export function LinkedObjects({ objectId, readOnly }: LinkedObjectsProps) {
  const { relations, isLoading, createLink, removeLink } = useObjectRelations(objectId)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mt-8 border-t pt-6">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="mb-3 flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronRightIcon className={`size-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        <LinkIcon className="size-4" />
        <h3 className="text-sm font-medium">
          Links{relations.length > 0 && ` (${relations.length})`}
        </h3>
      </button>

      {isExpanded && !isLoading && (
        <>
          {relations.length > 0 && (
            <div className="mb-3 space-y-1">
              {relations.map(relation => (
                <div
                  key={relation.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
                >
                  {relation.linkedObject?.icon && (
                    <span className="shrink-0 text-sm">{relation.linkedObject.icon}</span>
                  )}
                  <Link
                    href={`/objects/${relation.linkedObject?.id ?? relation.target_id}`}
                    className="flex-1 truncate text-sm hover:underline"
                  >
                    {relation.linkedObject?.title || 'Untitled'}
                  </Link>
                  {relation.relation_type === 'link' ? (
                    !readOnly && (
                      <button
                        type="button"
                        onClick={() => removeLink(relation.id)}
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Remove link"
                      >
                        <XIcon className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    )
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">mention</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!readOnly && (
            isSearchOpen ? (
              <LinkSearch
                objectId={objectId}
                existingTargetIds={new Set(relations.map(r => r.target_id))}
                onSelect={async (targetId) => {
                  await createLink(targetId)
                  setIsSearchOpen(false)
                }}
                onClose={() => setIsSearchOpen(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              >
                <PlusIcon className="size-3.5" />
                Add link
              </button>
            )
          )}
        </>
      )}
    </div>
  )
}

interface LinkSearchProps {
  objectId: string
  existingTargetIds: Set<string>
  onSelect: (targetId: string) => void
  onClose: () => void
}

function LinkSearch({ objectId, existingTargetIds, onSelect, onClose }: LinkSearchProps) {
  const dataClient = useDataClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DataObject[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Search objects
  useEffect(() => {
    let cancelled = false

    async function search() {
      const result = await dataClient.objects.search(query)
      if (!cancelled) {
        // Filter out self and already-linked objects
        const filtered = result.data.filter(
          obj => obj.id !== objectId && !existingTargetIds.has(obj.id)
        )
        setResults(filtered)
        setSelectedIndex(0)
      }
    }

    search()
    return () => { cancelled = true }
  }, [dataClient, query, objectId, existingTargetIds])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => prev < results.length - 1 ? prev + 1 : 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : results.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        onSelect(results[selectedIndex].id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [results, selectedIndex, onSelect, onClose])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div ref={containerRef} className="rounded-lg border bg-popover shadow-sm">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search entries..."
        className="w-full rounded-t-lg border-b bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="max-h-48 overflow-y-auto p-1">
        {results.length > 0 ? (
          results.map((obj, index) => (
            <button
              key={obj.id}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                onSelect(obj.id)
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              {obj.icon && <span className="shrink-0">{obj.icon}</span>}
              <span className="truncate">{obj.title || 'Untitled'}</span>
            </button>
          ))
        ) : (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            {query ? 'No entries found' : 'Type to search...'}
          </div>
        )}
      </div>
    </div>
  )
}
