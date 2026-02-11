'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEditorRef, PlateElement, type PlateElementProps } from '@udecode/plate/react'
import {
  Heading1,
  Heading2,
  Heading3,
  Text,
  Quote,
  Code,
  List,
  ListOrdered,
  ChevronRight,
  AlertCircle,
  Table,
  Image as ImageIcon,
} from 'lucide-react'
import { useObjectTypes, TypeIcon } from '@/features/object-types'
import { useObjects } from '@/features/objects'
import { useObjectModal } from '@/shared/stores/objectModal'

interface SlashMenuItem {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  type: string
  category: string
}

const menuItems: SlashMenuItem[] = [
  {
    key: 'p',
    label: 'Text',
    description: 'Plain text paragraph',
    icon: <Text className="size-4" />,
    type: 'p',
    category: 'Basic',
  },
  {
    key: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="size-4" />,
    type: 'h1',
    category: 'Basic',
  },
  {
    key: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="size-4" />,
    type: 'h2',
    category: 'Basic',
  },
  {
    key: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="size-4" />,
    type: 'h3',
    category: 'Basic',
  },
  {
    key: 'ul',
    label: 'Bulleted list',
    description: 'Unordered list with bullets',
    icon: <List className="size-4" />,
    type: 'ul',
    category: 'Lists',
  },
  {
    key: 'ol',
    label: 'Numbered list',
    description: 'Ordered list with numbers',
    icon: <ListOrdered className="size-4" />,
    type: 'ol',
    category: 'Lists',
  },
  {
    key: 'toggle',
    label: 'Toggle',
    description: 'Collapsible content block',
    icon: <ChevronRight className="size-4" />,
    type: 'toggle',
    category: 'Lists',
  },
  {
    key: 'img',
    label: 'Image',
    description: 'Upload or embed an image',
    icon: <ImageIcon className="size-4" />,
    type: 'img',
    category: 'Media',
  },
  {
    key: 'blockquote',
    label: 'Quote',
    description: 'Capture a quote',
    icon: <Quote className="size-4" />,
    type: 'blockquote',
    category: 'Advanced',
  },
  {
    key: 'code_block',
    label: 'Code',
    description: 'Code block with syntax highlighting',
    icon: <Code className="size-4" />,
    type: 'code_block',
    category: 'Advanced',
  },
  {
    key: 'callout',
    label: 'Callout',
    description: 'Highlight important information',
    icon: <AlertCircle className="size-4" />,
    type: 'callout',
    category: 'Advanced',
  },
  {
    key: 'table',
    label: 'Table',
    description: 'Create a table',
    icon: <Table className="size-4" />,
    type: 'table',
    category: 'Advanced',
  },
]

export function SlashInputElement({ children, element, ...props }: PlateElementProps) {
  const editor = useEditorRef()
  const { types } = useObjectTypes()
  const { create } = useObjects({ enabled: false })
  const inputRef = useRef<HTMLSpanElement>(null)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isKeyboardMode, setIsKeyboardMode] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)

  // Auto-focus the filter input on mount
  useEffect(() => {
    filterInputRef.current?.focus()
  }, [])

  // Filter items based on query
  const filteredItems = menuItems.filter(
    item =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  )

  // Filter create-new items based on query
  const filteredCreateTypes = types.filter(
    type =>
      !query ||
      type.name.toLowerCase().includes(query.toLowerCase()) ||
      `new ${type.name}`.toLowerCase().includes(query.toLowerCase())
  )

  // Group items by category with pre-calculated indices
  const categories: string[] = []
  const groupedItems: Record<string, Array<SlashMenuItem & { index: number }>> = {}
  let idx = 0
  for (const item of filteredItems) {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = []
      categories.push(item.category)
    }
    groupedItems[item.category].push({ ...item, index: idx++ })
  }

  const totalItems = filteredItems.length + filteredCreateTypes.length

  // Select item and insert block
  const selectItem = useCallback(
    (type: string) => {
      // Remove the slash input node
      editor.tf.removeNodes({
        match: (n) => 'type' in n && n.type === 'slash_input',
      })

      // Insert the appropriate block type
      if (type === 'p' || type === 'h1' || type === 'h2' || type === 'h3') {
        editor.tf.insertNodes({ type, children: [{ text: '' }] })
      } else if (type === 'blockquote') {
        editor.tf.insertNodes({
          type: 'blockquote',
          children: [{ type: 'p', children: [{ text: '' }] }],
        })
      } else if (type === 'code_block') {
        editor.tf.insertNodes({
          type: 'code_block',
          lang: 'javascript',
          children: [{ type: 'code_line', children: [{ text: '' }] }],
        })
      } else if (type === 'ul' || type === 'ol') {
        editor.tf.insertNodes({
          type,
          children: [
            {
              type: 'li',
              children: [{ type: 'lic', children: [{ text: '' }] }],
            },
          ],
        })
      } else if (type === 'toggle') {
        editor.tf.insertNodes({
          type: 'toggle',
          children: [{ text: '' }],
        })
      } else if (type === 'callout') {
        editor.tf.insertNodes({
          type: 'callout',
          variant: 'info',
          children: [{ text: '' }],
        })
      } else if (type === 'table') {
        editor.tf.insertNodes({
          type: 'table',
          children: [
            {
              type: 'tr',
              children: [
                { type: 'td', children: [{ text: '' }] },
                { type: 'td', children: [{ text: '' }] },
              ],
            },
            {
              type: 'tr',
              children: [
                { type: 'td', children: [{ text: '' }] },
                { type: 'td', children: [{ text: '' }] },
              ],
            },
          ],
        })
      } else if (type === 'img') {
        editor.tf.insertNodes({
          type: 'img',
          url: '',
          children: [{ text: '' }],
        })
      } else {
        editor.tf.insertNodes({ type, children: [{ text: '' }] })
      }
    },
    [editor]
  )

  // Create a new object and insert a mention node
  const createAndInsertMention = useCallback(
    async (typeId: string, typeName: string) => {
      // Remove the slash input node
      editor.tf.removeNodes({
        match: (n) => 'type' in n && n.type === 'slash_input',
      })

      const obj = await create({ title: `Untitled ${typeName}`, type_id: typeId })
      if (obj) {
        editor.tf.insertNodes({
          type: 'mention',
          objectId: obj.id,
          objectTitle: obj.title,
          children: [{ text: '' }],
        })
        editor.tf.move()
        useObjectModal.getState().open(obj.id)
      }
    },
    [editor, create]
  )

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Close the slash menu
  const closeMenu = useCallback(() => {
    // Replace the slash_input with a text node containing what was typed
    const slashInputEntry = editor.api.nodes({
      match: (n) => 'type' in n && n.type === 'slash_input',
    }).next().value

    if (slashInputEntry) {
      const [, path] = slashInputEntry
      editor.tf.removeNodes({ at: path })
      editor.tf.insertNodes(
        { text: '/' + query },
        { at: path }
      )
    }
  }, [editor, query])

  // Keyboard navigation handler for the filter input
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIsKeyboardMode(true)
        setSelectedIndex(prev =>
          prev < totalItems - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIsKeyboardMode(true)
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : totalItems - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex < filteredItems.length) {
          if (filteredItems[selectedIndex]) {
            selectItem(filteredItems[selectedIndex].type)
          }
        } else {
          const typeIndex = selectedIndex - filteredItems.length
          const type = filteredCreateTypes[typeIndex]
          if (type) {
            createAndInsertMention(type.id, type.name)
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu()
      } else if (e.key === 'Backspace' && query === '') {
        e.preventDefault()
        closeMenu()
      }
    },
    [filteredItems, filteredCreateTypes, totalItems, selectedIndex, selectItem, createAndInsertMention, closeMenu, query]
  )

  // Scroll selected item into view (only for keyboard navigation)
  useEffect(() => {
    if (isKeyboardMode && scrollContainerRef.current) {
      const selectedItem = scrollContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, isKeyboardMode])

  // Handle mouse move to exit keyboard mode
  const handleMouseMove = useCallback(() => {
    if (isKeyboardMode) {
      setIsKeyboardMode(false)
    }
  }, [isKeyboardMode])

  // Position the dropdown relative to the trigger element
  useEffect(() => {
    function updatePosition() {
      if (!inputRef.current) return
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }

    updatePosition()

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
      <span
        ref={inputRef}
        className="rounded bg-muted px-1 text-muted-foreground"
        contentEditable={false}
      >
        /
        <input
          ref={filterInputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          className="bg-transparent outline-none border-none p-0 text-muted-foreground"
          style={{ width: `${Math.max(query.length, 1)}ch` }}
        />
      </span>
      <span className="hidden">{children}</span>

      {/* Dropdown portaled to body to escape overflow:auto ancestors */}
      {dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          contentEditable={false}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
          className="z-50 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
        >
          <div ref={scrollContainerRef} className="max-h-80 overflow-y-auto p-1" onMouseMove={handleMouseMove}>
            {categories.length > 0 ? (
              categories.map(category => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {category}
                  </div>
                  {groupedItems[category].map(item => {
                    const isSelected = item.index === selectedIndex
                    return (
                      <button
                        key={item.key}
                        type="button"
                        data-index={item.index}
                        onMouseDown={e => {
                          e.preventDefault()
                          selectItem(item.type)
                        }}
                        onMouseEnter={() => {
                          if (!isKeyboardMode) {
                            setSelectedIndex(item.index)
                          }
                        }}
                        className={`flex w-full items-center gap-3 rounded px-2 py-2 text-left ${
                          isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                        }`}
                      >
                        <span className="flex size-8 items-center justify-center rounded bg-muted">
                          {item.icon}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            ) : filteredCreateTypes.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No blocks found
              </div>
            ) : null}
            {filteredCreateTypes.length > 0 && (
              <>
                {categories.length > 0 && (
                  <div className="my-1 border-t" />
                )}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Create New
                </div>
                {filteredCreateTypes.map((type, i) => {
                  const flatIndex = filteredItems.length + i
                  const isSelected = flatIndex === selectedIndex
                  return (
                    <button
                      key={type.id}
                      type="button"
                      data-index={flatIndex}
                      onMouseDown={e => {
                        e.preventDefault()
                        createAndInsertMention(type.id, type.name)
                      }}
                      onMouseEnter={() => {
                        if (!isKeyboardMode) {
                          setSelectedIndex(flatIndex)
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded px-2 py-2 text-left ${
                        isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                    >
                      <span className="flex size-8 items-center justify-center rounded bg-muted">
                        <TypeIcon icon={type.icon} />
                      </span>
                      <div>
                        <div className="text-sm font-medium">New {type.name}</div>
                        <div className="text-xs text-muted-foreground">Create and insert a mention</div>
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </PlateElement>
  )
}
