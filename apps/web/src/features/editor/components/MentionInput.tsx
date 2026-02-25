'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileText, Plus } from 'lucide-react';

interface MentionResult {
  id: string;
  title: string;
  type: string;
  icon?: string;
}

interface MentionInputProps {
  query: string;
  results: MentionResult[];
  onSelect: (result: MentionResult) => void;
  onCreate: (title: string) => void;
  isLoading?: boolean;
}

export function MentionInput({
  query,
  results,
  onSelect,
  onCreate,
  isLoading,
}: MentionInputProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Group results by type
  const groupedResults = results.reduce(
    (groups, result) => {
      const type = result.type || 'Other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(result);
      return groups;
    },
    {} as Record<string, MentionResult[]>
  );

  const types = Object.keys(groupedResults);
  const flatResults = types.flatMap((type) => groupedResults[type]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (flatResults.length + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length + 1) % (flatResults.length + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < flatResults.length) {
          onSelect(flatResults[selectedIndex]);
        } else {
          onCreate(query);
        }
      }
    },
    [flatResults, selectedIndex, onSelect, onCreate, query]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  let currentIndex = 0;

  return (
    <div role="listbox" aria-label="Mention suggestions" className="w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="max-h-80 overflow-y-auto p-1">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        )}

        {!isLoading && types.length > 0 && (
          <>
            {types.map((type) => (
              <div key={type}>
                <div className="px-2 py-1.5 text-xs font-semibold capitalize text-gray-500 dark:text-gray-400">
                  {type}s
                </div>
                {groupedResults[type].map((result) => {
                  const itemIndex = currentIndex++;
                  const isSelected = itemIndex === selectedIndex;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => onSelect(result)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-gray-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center">
                        {result.icon || <FileText className="h-4 w-4 text-gray-400" />}
                      </span>
                      <span className="truncate text-sm">{result.title || 'Untitled'}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {!isLoading && results.length === 0 && (
          <div className="px-2 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
            No results found
          </div>
        )}

        {/* Create new option */}
        <div className="mt-1 border-t border-gray-200 pt-1 dark:border-gray-700">
          <button
            type="button"
            onClick={() => onCreate(query)}
            onMouseEnter={() => setSelectedIndex(flatResults.length)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${
              selectedIndex === flatResults.length
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
              <Plus className="h-4 w-4" />
            </span>
            <span className="text-sm">
              Create &ldquo;{query || 'new page'}&rdquo;
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
