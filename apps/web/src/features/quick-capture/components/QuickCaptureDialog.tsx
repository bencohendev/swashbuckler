'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { LayersIcon, ChevronRightIcon, ChevronLeftIcon, CopyIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { cn } from '@/shared/lib/utils'
import { useObjectTypes } from '@/features/object-types/hooks/useObjectTypes'
import { TypeIcon } from '@/features/object-types/components/TypeIcon'
import { CreateTypeDialog } from '@/features/object-types'
import { useObjects } from '@/features/objects/hooks/useObjects'
import { useSpacePermission } from '@/features/sharing'
import { useNextTitle } from '@/features/objects/hooks/useNextTitle'
import { toast } from '@/shared/hooks/useToast'
import { useObjectModal } from '@/shared/stores/objectModal'
import { useTemplates } from '@/features/templates'
import { VariablePromptDialog } from '@/features/templates/components/VariablePromptDialog'
import { useAuth, useCurrentSpace } from '@/shared/lib/data'
import type { Template } from '@/shared/lib/data'
import type { VariableResolutionContext } from '@/features/templates/lib/variables'

interface QuickCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCaptureDialog({ open, onOpenChange }: QuickCaptureDialogProps) {
  const { types, create: createType } = useObjectTypes()
  const { create } = useObjects({ enabled: false })
  const { isOwner: isSpaceOwner } = useSpacePermission()
  const getNextTitle = useNextTitle()
  const { templates, createFromTemplate, createFromTemplateWithVariables, getTemplateVariables } = useTemplates()
  const { user } = useAuth()
  const { space } = useCurrentSpace()

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateType, setShowCreateType] = useState(false)
  const [selectedType, setSelectedType] = useState<{ id: string; name: string; icon: string } | null>(null)
  const [variableDialogOpen, setVariableDialogOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<{ id: string; customVariables: string[] } | null>(null)

  // Group templates by type_id
  const templatesByType = useMemo(() => {
    const map = new Map<string, Template[]>()
    for (const t of templates) {
      const existing = map.get(t.type_id)
      if (existing) {
        existing.push(t)
      } else {
        map.set(t.type_id, [t])
      }
    }
    return map
  }, [templates])

  const typesWithTemplates = useMemo(
    () => new Set([...templatesByType.keys()]),
    [templatesByType],
  )

  // Level 2 templates for the selected type
  const level2Templates = selectedType ? (templatesByType.get(selectedType.id) ?? []) : []

  // Total items depends on which level we're on
  const totalItems = selectedType
    ? 1 + level2Templates.length // "Blank" + templates
    : types.length + (isSpaceOwner ? 1 : 0) // types + "New Type"

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIndex(0) // eslint-disable-line react-hooks/set-state-in-effect -- reset on dialog open
      setIsCreating(false)
      setSelectedType(null)
    }
  }, [open])

  const buildResolutionContext = useCallback((): VariableResolutionContext => ({
    userName: user?.email ?? null,
    spaceName: space?.name ?? null,
  }), [user, space])

  const handleSelect = useCallback(async (typeId: string, typeName: string) => {
    if (isCreating) return
    setIsCreating(true)

    const result = await create({
      title: getNextTitle(typeId, typeName),
      type_id: typeId,
    })

    if (result) {
      onOpenChange(false)
      useObjectModal.getState().open(result.id, { autoFocus: true })
    } else {
      toast({ description: 'Failed to create entry. You may not have permission.', variant: 'destructive' })
    }

    setIsCreating(false)
  }, [isCreating, create, getNextTitle, onOpenChange])

  const handleSelectTemplate = useCallback(async (template: Template) => {
    if (isCreating) return
    setIsCreating(true)

    const info = await getTemplateVariables(template.id)

    if (info && info.customVariables.length > 0) {
      // Has custom variables — close dialog, open variable prompt
      onOpenChange(false)
      setPendingTemplate({ id: template.id, customVariables: info.customVariables })
      setVariableDialogOpen(true)
      setIsCreating(false)
      return
    }

    // No custom variables — resolve built-ins inline if any, otherwise plain copy
    let result
    if (info && info.hasVariables) {
      result = await createFromTemplateWithVariables(template.id, {}, buildResolutionContext())
    } else {
      result = await createFromTemplate(template.id)
    }

    if (result) {
      onOpenChange(false)
      useObjectModal.getState().open(result.id, { autoFocus: true })
    } else {
      toast({ description: 'Failed to create from template.', variant: 'destructive' })
    }

    setIsCreating(false)
  }, [isCreating, getTemplateVariables, createFromTemplateWithVariables, createFromTemplate, buildResolutionContext, onOpenChange])

  const handleVariableSubmit = useCallback(async (values: Record<string, string>) => {
    if (!pendingTemplate) return
    setVariableDialogOpen(false)
    const result = await createFromTemplateWithVariables(
      pendingTemplate.id,
      values,
      buildResolutionContext(),
    )
    setPendingTemplate(null)
    if (result) {
      useObjectModal.getState().open(result.id, { autoFocus: true })
    }
  }, [pendingTemplate, createFromTemplateWithVariables, buildResolutionContext])

  const handleCreateType = useCallback(() => {
    onOpenChange(false)
    setShowCreateType(true)
  }, [onOpenChange])

  const drillIntoType = useCallback((type: { id: string; name: string; icon: string }) => {
    setSelectedType(type)
    setSelectedIndex(0)
  }, [])

  const returnToLevel1 = useCallback(() => {
    setSelectedType(null)
    setSelectedIndex(0)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedType) {
        // Level 2
        if (selectedIndex === 0) {
          handleSelect(selectedType.id, selectedType.name)
        } else {
          const template = level2Templates[selectedIndex - 1]
          if (template) handleSelectTemplate(template)
        }
      } else {
        // Level 1
        if (selectedIndex < types.length && types[selectedIndex]) {
          const type = types[selectedIndex]
          if (typesWithTemplates.has(type.id)) {
            drillIntoType({ id: type.id, name: type.name, icon: type.icon ?? '' })
          } else {
            handleSelect(type.id, type.name)
          }
        } else if (selectedIndex === types.length) {
          handleCreateType()
        }
      }
    } else if (e.key === 'Escape' && selectedType) {
      e.preventDefault()
      e.stopPropagation()
      returnToLevel1()
    } else if (e.key === 'Backspace' && selectedType) {
      e.preventDefault()
      returnToLevel1()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-sm"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">Quick Capture</DialogTitle>

          {selectedType ? (
            <>
              {/* Level 2: Back header */}
              <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                <button
                  onClick={returnToLevel1}
                  className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Back to type list"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <TypeIcon icon={selectedType.icon} className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  New {selectedType.name}
                </span>
              </div>

              {/* Level 2: Template list */}
              <div className="max-h-72 overflow-y-auto py-1">
                {/* Blank option */}
                <button
                  data-selected={selectedIndex === 0}
                  onClick={() => handleSelect(selectedType.id, selectedType.name)}
                  onMouseEnter={() => setSelectedIndex(0)}
                  disabled={isCreating}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    selectedIndex === 0 ? 'bg-accent' : 'hover:bg-accent/50',
                    isCreating && 'opacity-50'
                  )}
                >
                  <TypeIcon icon={selectedType.icon} className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">New {selectedType.name} (no template)</span>
                </button>

                {/* Templates */}
                {level2Templates.map((template, index) => (
                  <button
                    key={template.id}
                    data-selected={selectedIndex === index + 1}
                    onClick={() => handleSelectTemplate(template)}
                    onMouseEnter={() => setSelectedIndex(index + 1)}
                    disabled={isCreating}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      selectedIndex === index + 1 ? 'bg-accent' : 'hover:bg-accent/50',
                      isCreating && 'opacity-50'
                    )}
                  >
                    <CopyIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{template.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Level 1: Type list */}
              <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Create new
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {types.length === 0 && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No types available
                  </div>
                )}
                {types.map((type, index) => {
                  const hasTemplates = typesWithTemplates.has(type.id)
                  return (
                    <button
                      key={type.id}
                      data-selected={index === selectedIndex}
                      onClick={() => {
                        if (hasTemplates) {
                          drillIntoType({ id: type.id, name: type.name, icon: type.icon ?? '' })
                        } else {
                          handleSelect(type.id, type.name)
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      disabled={isCreating}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50',
                        isCreating && 'opacity-50'
                      )}
                    >
                      <TypeIcon icon={type.icon} className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{type.name}</span>
                      {hasTemplates && (
                        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  )
                })}
                {isSpaceOwner && (
                  <>
                    <div className="border-t my-1" />
                    <button
                      data-selected={selectedIndex === types.length}
                      onClick={handleCreateType}
                      onMouseEnter={() => setSelectedIndex(types.length)}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        selectedIndex === types.length ? 'bg-accent' : 'hover:bg-accent/50',
                      )}
                    >
                      <LayersIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">New Type</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* Keyboard hints */}
          <div className="flex items-center gap-3 border-t bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex min-w-4 items-center justify-center rounded border bg-background px-0.5 font-mono text-[10px]">↑</kbd>
              <kbd className="inline-flex min-w-4 items-center justify-center rounded border bg-background px-0.5 font-mono text-[10px]">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex min-w-4 items-center justify-center rounded border bg-background px-0.5 font-mono text-[10px]">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex min-w-4 items-center justify-center rounded border bg-background px-0.5 font-mono text-[10px]">esc</kbd>
              <span>close</span>
            </span>
          </div>
        </DialogContent>
      </Dialog>
      <CreateTypeDialog
        open={showCreateType}
        onOpenChange={setShowCreateType}
        onCreate={createType}
      />
      {pendingTemplate && (
        <VariablePromptDialog
          open={variableDialogOpen}
          onOpenChange={(open) => {
            setVariableDialogOpen(open)
            if (!open) setPendingTemplate(null)
          }}
          variableNames={pendingTemplate.customVariables}
          onSubmit={handleVariableSubmit}
        />
      )}
    </>
  )
}
