'use client'

import { useState, useRef, useEffect, useCallback, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useEditorRef, PlateElement, type PlateElementProps } from '@udecode/plate/react'
import EmojiPickerReact, { Theme } from 'emoji-picker-react'
import { useTheme } from 'next-themes'
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
  ListTodo,
  AlertCircle,
  Table,
  Image as ImageIcon,
  BracesIcon,
  EyeOff,
  SmileIcon,
} from 'lucide-react'
import { useObjectTypes, TypeIcon } from '@/features/object-types'
import { useObjects, useNextTitle } from '@/features/objects'
import { useObjectModal } from '@/shared/stores/objectModal'
import { EditorModeContext } from '../Editor'
import { BUILT_IN_VARIABLES } from '@/features/templates/lib/variables'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { focusEditorAtSelection, focusEditorNow } from '../../lib/focusEditor'

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
    key: 'action_item',
    label: 'To-do list',
    description: 'Track tasks with checkboxes',
    icon: <ListTodo className="size-4" />,
    type: 'action_item',
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
  {
    key: 'emoji',
    label: 'Emoji',
    description: 'Insert an emoji',
    icon: <SmileIcon className="size-4" />,
    type: 'emoji',
    category: 'Advanced',
  },
]

export function SlashInputElement({ children, element, ...props }: PlateElementProps) {
  const editor = useEditorRef()
  const { isTemplateMode, isOwner } = useContext(EditorModeContext)
  const { types } = useObjectTypes()
  const { create } = useObjects({ enabled: false })
  const isMobile = useIsMobile()
  const getNextTitle = useNextTitle()
  const inputRef = useRef<HTMLSpanElement>(null)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isKeyboardMode, setIsKeyboardMode] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Auto-focus the filter input on mount (skip on mobile to avoid keyboard flicker)
  useEffect(() => {
    if (!isMobile) {
      filterInputRef.current?.focus()
    }
  }, [isMobile])

  // Build variable items when in template mode
  const variableItems: SlashMenuItem[] = isTemplateMode
    ? [
        ...BUILT_IN_VARIABLES.map(v => ({
          key: `var_${v.name}`,
          label: `{{${v.name}}}`,
          description: v.description,
          icon: <BracesIcon className="size-4" />,
          type: `template_variable:builtin:${v.name}`,
          category: 'Variables',
        })),
        {
          key: 'var_custom',
          label: 'Custom variable',
          description: 'Prompt user for a value',
          icon: <BracesIcon className="size-4" />,
          type: 'template_variable:custom',
          category: 'Variables',
        },
      ]
    : []

  // Owner-only items
  const ownerItems: SlashMenuItem[] = isOwner
    ? [
        {
          key: 'private_block',
          label: 'Private block',
          description: 'Content only visible to you',
          icon: <EyeOff className="size-4" />,
          type: 'private_block',
          category: 'Advanced',
        },
      ]
    : []

  // Filter items based on query
  const allMenuItems = [...menuItems, ...ownerItems, ...variableItems]
  const filteredItems = allMenuItems.filter(
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

  // Insert an emoji character at the slash input position
  const insertEmoji = useCallback(
    (emoji: string) => {
      editor.tf.removeNodes({
        match: (n) => 'type' in n && n.type === 'slash_input',
      })
      editor.tf.insertText(emoji)
      focusEditorAtSelection(editor)
    },
    [editor]
  )

  // Select item and insert block
  const selectItem = useCallback(
    (type: string) => {
      // Handle emoji picker — show picker instead of inserting
      if (type === 'emoji') {
        setShowEmojiPicker(true)
        return
      }

      // Handle template variable insertion (inline elements)
      if (type.startsWith('template_variable:')) {
        const parts = type.split(':')
        if (parts[1] === 'custom') {
          const name = window.prompt('Variable name:')
          if (!name) return
          editor.tf.removeNodes({
            match: (n) => 'type' in n && n.type === 'slash_input',
          })
          editor.tf.insertNodes({
            type: 'template_variable',
            variableType: 'custom',
            variableName: name.trim(),
            children: [{ text: '' }],
          })
          editor.tf.move()
          focusEditorAtSelection(editor)
          return
        }
        // Built-in variable
        const variableName = parts[2]
        editor.tf.removeNodes({
          match: (n) => 'type' in n && n.type === 'slash_input',
        })
        editor.tf.insertNodes({
          type: 'template_variable',
          variableType: 'builtin',
          variableName,
          children: [{ text: '' }],
        })
        editor.tf.move()
        focusEditorAtSelection(editor)
        return
      }

      // Find the slash_input node and its parent block path
      const slashEntry = editor.api.nodes({
        match: (n) => 'type' in n && n.type === 'slash_input',
      }).next().value
      if (!slashEntry) return
      const [, slashPath] = slashEntry
      const blockPath = slashPath.slice(0, -1)

      // Remove the slash input inline node from its parent block
      editor.tf.removeNodes({ at: slashPath })

      // For simple block types, transform the parent block in place.
      // The text node persists so the existing selection stays valid.
      if (type === 'p' || type === 'h1' || type === 'h2' || type === 'h3') {
        editor.tf.setNodes({ type }, { at: blockPath })
        focusEditorAtSelection(editor)
        return
      }

      // For complex blocks, replace the parent block entirely
      editor.tf.removeNodes({ at: blockPath })

      let node
      if (type === 'blockquote') {
        node = {
          type: 'blockquote',
          children: [{ type: 'p', children: [{ text: '' }] }],
        }
      } else if (type === 'code_block') {
        node = {
          type: 'code_block',
          lang: 'javascript',
          children: [{ type: 'code_line', children: [{ text: '' }] }],
        }
      } else if (type === 'ul' || type === 'ol') {
        node = {
          type,
          children: [
            {
              type: 'li',
              children: [{ type: 'lic', children: [{ text: '' }] }],
            },
          ],
        }
      } else if (type === 'action_item') {
        node = {
          type: 'action_item',
          checked: false,
          children: [{ text: '' }],
        }
      } else if (type === 'toggle') {
        node = {
          type: 'toggle',
          children: [{ text: '' }],
        }
      } else if (type === 'callout') {
        node = {
          type: 'callout',
          variant: 'info',
          children: [{ text: '' }],
        }
      } else if (type === 'table') {
        node = {
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
        }
      } else if (type === 'private_block') {
        node = {
          type: 'private_block',
          children: [{ type: 'p', children: [{ text: '' }] }],
        }
      } else if (type === 'img') {
        node = {
          type: 'img',
          url: '',
          children: [{ text: '' }],
        }
      } else {
        node = { type, children: [{ text: '' }] }
      }

      editor.tf.insertNodes(node, { at: blockPath })

      // Defer selection + focus so plugin normalization finishes first
      setTimeout(() => {
        const start = editor.api.start(blockPath)
        if (start) {
          editor.tf.select(start)
        }
        focusEditorNow(editor)
      }, 0)
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

      const obj = await create({ title: getNextTitle(typeId, typeName), type_id: typeId })
      if (obj) {
        editor.tf.insertNodes({
          type: 'mention',
          objectId: obj.id,
          objectTitle: obj.title,
          children: [{ text: '' }],
        })
        editor.tf.move()
        focusEditorAtSelection(editor)
        useObjectModal.getState().open(obj.id, {
          autoFocus: true,
          onClose: () => focusEditorAtSelection(editor),
        })
      }
    },
    [editor, create, getNextTitle]
  )

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0) // eslint-disable-line react-hooks/set-state-in-effect -- reset derived state on query change
  }, [query])

  // Close the slash menu
  const closeMenu = useCallback(() => {
    // Replace the slash_input with a text node containing what was typed
    const slashInputEntry = editor.api.nodes({
      match: (n) => 'type' in n && n.type === 'slash_input',
    }).next().value

    if (slashInputEntry) {
      const [, path] = slashInputEntry
      const textToInsert = '/' + query
      editor.tf.removeNodes({ at: path })
      editor.tf.insertNodes(
        { text: textToInsert },
        { at: path }
      )
      // Advance cursor past the inserted text (insertNodes at an explicit
      // path doesn't move the selection, so it's still before the text)
      if (editor.selection) {
        const { path: selPath, offset } = editor.selection.anchor
        editor.tf.select({ path: selPath, offset: offset + textToInsert.length })
      }
      focusEditorAtSelection(editor)
    }
  }, [editor, query])

  // Keyboard navigation handler for the filter input
  const handleInputKeyDown = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization -- complex deps that compiler can't trace
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
    [filteredItems, filteredCreateTypes, totalItems, selectedIndex, selectItem, createAndInsertMention, closeMenu, query] // eslint-disable-line react-hooks/preserve-manual-memoization
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

  // Position the dropdown relative to the trigger element (desktop only)
  useEffect(() => {
    if (isMobile) return // bottom panel needs no position calculation

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
  }, [isMobile])

  // Click outside to close (desktop only; mobile uses backdrop tap)
  useEffect(() => {
    if (isMobile) return

    const handlePointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isMobile, closeMenu])

  // Shared menu items JSX used by both mobile and desktop
  const menuItemsJSX = (
    <>
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
    </>
  )

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

      {/* Menu portaled to body to escape overflow:auto ancestors */}
      {createPortal(
        isMobile ? (
          <>
            {/* Backdrop — tap to close */}
            <div
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-black/30"
              onPointerDown={() => closeMenu()}
            />
            {/* Bottom panel */}
            <div
              ref={dropdownRef}
              role="menu"
              aria-label="Insert block"
              contentEditable={false}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t bg-popover shadow-2xl"
            >
              {/* Drag-handle affordance */}
              <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              {showEmojiPicker ? (
                <div className="flex justify-center pb-2">
                  <EmojiPickerReact
                    theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                    onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                    skinTonesDisabled
                    width="100%"
                    height={350}
                  />
                </div>
              ) : (
                <>
                  {/* Filter input — visible but not auto-focused */}
                  <div className="px-3 pb-2">
                    <input
                      ref={filterInputRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Search blocks..."
                      aria-label="Filter blocks"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  {/* Scrollable items */}
                  <div
                    ref={scrollContainerRef}
                    className="max-h-[50vh] overflow-y-auto p-1"
                    onMouseMove={handleMouseMove}
                  >
                    {menuItemsJSX}
                  </div>
                </>
              )}
            </div>
          </>
        ) : dropdownPos ? (
          showEmojiPicker ? (
            <div
              ref={dropdownRef}
              contentEditable={false}
              style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
              className="z-50"
            >
              <EmojiPickerReact
                theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
                skinTonesDisabled
                width={320}
                height={400}
              />
            </div>
          ) : (
            <div
              ref={dropdownRef}
              contentEditable={false}
              style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}
              className="z-50 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
            >
              <div ref={scrollContainerRef} className="max-h-80 overflow-y-auto p-1" onMouseMove={handleMouseMove}>
                {menuItemsJSX}
              </div>
            </div>
          )
        ) : null,
        document.body
      )}
    </PlateElement>
  )
}
