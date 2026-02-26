'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/shared/components/ui/Input'
import type { Tag, ObjectType } from '@/shared/lib/data'
import { useDataClient } from '@/shared/lib/data'
import type { FilterFieldTarget } from '../lib/filterTypes'
import type { FilterFieldType } from '../lib/operatorRegistry'

interface FilterValueInputProps {
  target: FilterFieldTarget
  fieldType: FilterFieldType
  operator: string
  value: unknown
  value2?: unknown
  onChange: (value: unknown, value2?: unknown) => void
  tags: Tag[]
  objectTypes: ObjectType[]
  fieldOptions?: string[]
}

export function FilterValueInput({
  target,
  fieldType,
  operator,
  value,
  value2,
  onChange,
  tags,
  objectTypes,
  fieldOptions,
}: FilterValueInputProps) {
  // No value needed for these operators
  if (['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'has_links', 'has_no_links'].includes(operator)) {
    return null
  }

  if (target.kind === 'tag') {
    return (
      <TagSelect
        tags={tags}
        value={String(value ?? '')}
        onChange={(v) => onChange(v)}
      />
    )
  }

  if (target.kind === 'relation' && operator === 'links_to') {
    return (
      <ObjectSearch
        value={String(value ?? '')}
        onChange={(v) => onChange(v)}
      />
    )
  }

  if (target.kind === 'relation' && operator === 'links_to_type') {
    return (
      <TypeSelect
        objectTypes={objectTypes}
        value={String(value ?? '')}
        onChange={(v) => onChange(v)}
      />
    )
  }

  if (fieldType === 'select' && (operator === 'is' || operator === 'is_not')) {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter value"
        className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Select...</option>
        {(fieldOptions ?? []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (fieldType === 'multi_select' && (operator === 'contains' || operator === 'does_not_contain')) {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter value"
        className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Select...</option>
        {(fieldOptions ?? []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  }

  if (fieldType === 'number') {
    return (
      <Input
        type="number"
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        aria-label="Filter value"
        className="h-8 w-24 text-sm tabular-nums"
      />
    )
  }

  if (fieldType === 'date' || fieldType === 'system_date') {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Filter date"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        {operator === 'is_between' && (
          <>
            <span className="text-xs text-muted-foreground">and</span>
            <input
              type="date"
              value={String(value2 ?? '')}
              onChange={(e) => onChange(value, e.target.value)}
              aria-label="Filter end date"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </>
        )}
      </div>
    )
  }

  // Default: text input (text, url, title)
  return (
    <Input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value..."
      aria-label="Filter value"
      className="h-8 w-36 text-sm"
    />
  )
}

function TagSelect({
  tags,
  value,
  onChange,
}: {
  tags: Tag[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select tag"
      className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">Select tag...</option>
      {tags.map((tag) => (
        <option key={tag.id} value={tag.id}>{tag.name}</option>
      ))}
    </select>
  )
}

function TypeSelect({
  objectTypes,
  value,
  onChange,
}: {
  objectTypes: ObjectType[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select type"
      className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">Select type...</option>
      {objectTypes.map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  )
}

function ObjectSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const dataClient = useDataClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; title: string; icon: string | null }[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTitle, setSelectedTitle] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) return
    const timer = setTimeout(async () => {
      const result = await dataClient.objects.search(query)
      if (result.data) {
        setResults(result.data.map((o) => ({ id: o.id, title: o.title, icon: o.icon })))
        setSelectedIndex(0)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, dataClient])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((id: string, title: string) => {
    onChange(id)
    setSelectedTitle(title)
    setIsOpen(false)
    setQuery('')
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex].id, results[selectedIndex].title)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }, [results, selectedIndex, handleSelect])

  if (value && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className="h-8 max-w-40 truncate rounded-md border border-input bg-background px-2 text-sm hover:bg-accent"
      >
        {selectedTitle || value.slice(0, 8) + '...'}
      </button>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          const next = e.target.value
          setQuery(next)
          setIsOpen(true)
          if (!next.trim()) setResults([])
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search entries..."
        aria-label="Search entries to link"
        className="h-8 w-40 text-sm"
      />
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-56 overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r.id, r.title)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${i === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'}`}
            >
              <span>{r.icon ?? '\ud83d\udcc4'}</span>
              <span className="truncate">{r.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
