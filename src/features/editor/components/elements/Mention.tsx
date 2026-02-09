'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { PlateElementProps } from '@udecode/plate/react'
import { PlateElement, useEditorRef } from '@udecode/plate/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useDataClient, type DataObject } from '@/shared/lib/data'

function getMentionProps(element: Record<string, unknown>) {
  return {
    objectId: typeof element.objectId === 'string' ? element.objectId : undefined,
    objectTitle: typeof element.objectTitle === 'string' ? element.objectTitle : undefined,
  }
}

export function MentionElement({ element, children, ...props }: PlateElementProps) {
  const { objectId, objectTitle } = getMentionProps(element)

  if (!objectId) {
    return (
      <PlateElement {...props} element={element} className="inline">
        {children}
      </PlateElement>
    )
  }

  return (
    <PlateElement {...props} element={element} className="inline">
      <Link
        href={`/objects/${objectId}`}
        contentEditable={false}
        className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        {objectTitle || 'Untitled'}
      </Link>
      {children}
    </PlateElement>
  )
}

export function MentionInputElement({ children, element, ...props }: PlateElementProps) {
  const editor = useEditorRef()
  const dataClient = useDataClient()
  const params = useParams<{ id: string }>()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DataObject[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isKeyboardMode, setIsKeyboardMode] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)

  // Remove the leftover first '[' from the '[[' trigger on mount
  useEffect(() => {
    const mentionInputEntry = editor.api.node({
      match: (n) => 'type' in n && n.type === 'mention_input',
    })
    if (!mentionInputEntry) return

    const [, path] = mentionInputEntry
    const startPoint = editor.api.start(path)
    if (!startPoint) return

    const before = editor.api.before(startPoint)
    if (!before) return

    const beforeBefore = editor.api.before(before)
    if (!beforeBefore) return

    const charBefore = editor.api.string({ anchor: beforeBefore, focus: before })
    if (charBefore === '[') {
      editor.tf.delete({ at: { anchor: beforeBefore, focus: before } })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, [])

  // Get query from element text content
  useEffect(() => {
    const text = element.children?.[0]
    if (text && typeof text === 'object' && 'text' in text) {
      setQuery((text as { text: string }).text || '')
    }
  }, [element.children])

  // Search objects when query changes
  useEffect(() => {
    let cancelled = false

    async function search() {
      const result = await dataClient.objects.search(query)
      if (!cancelled) {
        setResults(result.data.filter(obj => obj.id !== params.id))
      }
    }

    search()
    return () => { cancelled = true }
  }, [dataClient, query])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Select an object and insert mention
  const selectObject = useCallback(
    (obj: DataObject) => {
      editor.tf.removeNodes({
        match: (n) => 'type' in n && n.type === 'mention_input',
      })

      editor.tf.insertNodes({
        type: 'mention',
        objectId: obj.id,
        objectTitle: obj.title,
        children: [{ text: '' }],
      })

      // Move cursor after the mention
      editor.tf.move()
    },
    [editor]
  )

  // Close the mention menu
  const closeMenu = useCallback(() => {
    const mentionInputEntry = editor.api.nodes({
      match: (n) => 'type' in n && n.type === 'mention_input',
    }).next().value

    if (mentionInputEntry) {
      const [, path] = mentionInputEntry
      editor.tf.removeNodes({ at: path })
      editor.tf.insertNodes(
        { text: '[[' + query },
        { at: path }
      )
    }
  }, [editor, query])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIsKeyboardMode(true)
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIsKeyboardMode(true)
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : results.length - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) {
          selectObject(results[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex, selectObject, closeMenu])

  // Scroll selected item into view
  useEffect(() => {
    if (isKeyboardMode && scrollContainerRef.current) {
      const selectedItem = scrollContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, isKeyboardMode])

  const handleMouseMove = useCallback(() => {
    if (isKeyboardMode) {
      setIsKeyboardMode(false)
    }
  }, [isKeyboardMode])

  // Position the dropdown relative to the trigger element
  useEffect(() => {
    function updatePosition() {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }

    updatePosition()

    // Reposition on scroll/resize since the trigger may move
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeMenu])

  return (
    <PlateElement {...props} element={element} as="span" className="inline">
      <span ref={triggerRef} className="rounded bg-blue-100 px-1 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        [[{children}
      </span>

      {/* Dropdown portaled to body to escape overflow:auto ancestors */}
      {dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          contentEditable={false}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="z-50 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
        >
          <div ref={scrollContainerRef} className="max-h-60 overflow-y-auto p-1" onMouseMove={handleMouseMove}>
            {results.length > 0 ? (
              results.map((obj, index) => {
                const isSelected = index === selectedIndex
                return (
                  <button
                    key={obj.id}
                    type="button"
                    data-index={index}
                    onMouseDown={e => {
                      e.preventDefault()
                      selectObject(obj)
                    }}
                    onMouseEnter={() => {
                      if (!isKeyboardMode) {
                        setSelectedIndex(index)
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                      isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                  >
                    {obj.icon && <span className="shrink-0">{obj.icon}</span>}
                    <span className="truncate">{obj.title || 'Untitled'}</span>
                  </button>
                )
              })
            ) : (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {query ? 'No objects found' : 'Type to search objects...'}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </PlateElement>
  )
}
