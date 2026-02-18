'use client';

import { useState, useCallback, useEffect } from 'react';
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
  Plus,
} from 'lucide-react';

interface SlashMenuItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  category: string;
}

const menuItems: SlashMenuItem[] = [
  // Basic blocks
  {
    key: 'p',
    label: 'Text',
    description: 'Plain text paragraph',
    icon: <Text className="h-4 w-4" />,
    type: 'p',
    category: 'Basic',
  },
  {
    key: 'h1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 className="h-4 w-4" />,
    type: 'h1',
    category: 'Basic',
  },
  {
    key: 'h2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="h-4 w-4" />,
    type: 'h2',
    category: 'Basic',
  },
  {
    key: 'h3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="h-4 w-4" />,
    type: 'h3',
    category: 'Basic',
  },
  // Lists
  {
    key: 'ul',
    label: 'Bulleted list',
    description: 'Unordered list with bullets',
    icon: <List className="h-4 w-4" />,
    type: 'ul',
    category: 'Lists',
  },
  {
    key: 'ol',
    label: 'Numbered list',
    description: 'Ordered list with numbers',
    icon: <ListOrdered className="h-4 w-4" />,
    type: 'ol',
    category: 'Lists',
  },
  {
    key: 'toggle',
    label: 'Toggle',
    description: 'Collapsible content block',
    icon: <ChevronRight className="h-4 w-4" />,
    type: 'toggle',
    category: 'Lists',
  },
  // Media
  {
    key: 'img',
    label: 'Image',
    description: 'Upload or embed an image',
    icon: <ImageIcon className="h-4 w-4" />,
    type: 'img',
    category: 'Media',
  },
  // Advanced
  {
    key: 'blockquote',
    label: 'Quote',
    description: 'Capture a quote',
    icon: <Quote className="h-4 w-4" />,
    type: 'blockquote',
    category: 'Advanced',
  },
  {
    key: 'code_block',
    label: 'Code',
    description: 'Code block with syntax highlighting',
    icon: <Code className="h-4 w-4" />,
    type: 'code_block',
    category: 'Advanced',
  },
  {
    key: 'callout',
    label: 'Callout',
    description: 'Highlight important information',
    icon: <AlertCircle className="h-4 w-4" />,
    type: 'callout',
    category: 'Advanced',
  },
  {
    key: 'table',
    label: 'Table',
    description: 'Create a table',
    icon: <Table className="h-4 w-4" />,
    type: 'table',
    category: 'Advanced',
  },
];

interface SlashMenuProps {
  query: string;
  onSelect: (type: string) => void;
  onCreateNew?: () => void;
}

export function SlashMenu({ query, onSelect, onCreateNew }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter items based on query
  const filteredItems = menuItems.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  // Group items by category
  const groupedItems = filteredItems.reduce(
    (groups, item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
      return groups;
    },
    {} as Record<string, SlashMenuItem[]>
  );

  const categories = Object.keys(groupedItems);

  // Flatten for keyboard navigation
  const flatItems = categories.flatMap((cat) => groupedItems[cat]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (flatItems.length + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatItems.length + 1) % (flatItems.length + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < flatItems.length) {
          onSelect(flatItems[selectedIndex].type);
        } else if (onCreateNew) {
          onCreateNew();
        }
      }
    },
    [flatItems, selectedIndex, onSelect, onCreateNew]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  let currentIndex = 0;

  return (
    <div role="menu" aria-label="Insert block" className="w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="max-h-80 overflow-y-auto p-1">
        {categories.map((category) => (
          <div key={category}>
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {category}
            </div>
            {groupedItems[category].map((item) => {
              const itemIndex = currentIndex++;
              const isSelected = itemIndex === selectedIndex;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  onClick={() => onSelect(item.type)}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                  className={`flex w-full items-center gap-3 rounded px-2 py-2 text-left ${
                    isSelected
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                    {item.icon}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {/* Create New option */}
        {onCreateNew && (
          <>
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            <button
              type="button"
              onClick={onCreateNew}
              onMouseEnter={() => setSelectedIndex(flatItems.length)}
              className={`flex w-full items-center gap-3 rounded px-2 py-2 text-left ${
                selectedIndex === flatItems.length
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                <Plus className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-medium">Create new...</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Create a new linked entry
                </div>
              </div>
            </button>
          </>
        )}

        {filteredItems.length === 0 && !onCreateNew && (
          <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No blocks found
          </div>
        )}
      </div>
    </div>
  );
}
