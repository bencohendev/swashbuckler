'use client'

import {
  FileTextIcon,
  StickyNoteIcon,
  FileIcon,
  CheckSquareIcon,
  BookOpenIcon,
  CalendarIcon,
  BookmarkIcon,
  ListTodoIcon,
  NotebookIcon,
  LinkIcon,
  StarIcon,
  FolderIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  'file-text': FileTextIcon,
  'sticky-note': StickyNoteIcon,
  'file': FileIcon,
  'check-square': CheckSquareIcon,
  'book-open': BookOpenIcon,
  'calendar': CalendarIcon,
  'bookmark': BookmarkIcon,
  'list-todo': ListTodoIcon,
  'notebook': NotebookIcon,
  'link': LinkIcon,
  'star': StarIcon,
  'folder': FolderIcon,
}

// Simple check if a string starts with an emoji (non-ASCII character)
function isEmoji(str: string): boolean {
  const codePoint = str.codePointAt(0)
  return codePoint !== undefined && codePoint > 255
}

interface TypeIconProps {
  icon: string
  className?: string
}

export function TypeIcon({ icon, className }: TypeIconProps) {
  if (isEmoji(icon)) {
    return <span className="shrink-0 leading-none">{icon}</span>
  }

  const Icon = iconMap[icon] ?? FileIcon
  return <Icon className={cn('size-4', className)} />
}
