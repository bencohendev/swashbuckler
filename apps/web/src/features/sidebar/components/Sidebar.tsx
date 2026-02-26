"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { SidebarLink } from "./SidebarLink"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { ArchiveIcon, BookOpenIcon, HelpCircleIcon, HomeIcon, KeyboardIcon, ListChevronsDownUpIcon, ListChevronsUpDownIcon, NetworkIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon, SettingsIcon, TrashIcon, XIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useSidebar } from "@/shared/stores/sidebar"
import { useRecentAccess } from "@/shared/stores/recentAccess"
import { useIsMobile } from "@/shared/hooks/useIsMobile"
import { useAuth, useCurrentSpace } from "@/shared/lib/data"
import type { DataObjectSummary, ObjectType, Template } from "@/shared/lib/data"
import { useObjects, useNextTitle } from "@/features/objects/hooks"
import { useTemplates } from "@/features/templates"
import { useObjectTypes, CreateTypeDialog } from "@/features/object-types"
import { useSpacePermission, useExclusionFilter } from "@/features/sharing"
import { useTags, TagsSection } from "@/features/tags"
import { usePins, PinnedSection } from "@/features/pins"
import { VariablePromptDialog } from "@/features/templates/components/VariablePromptDialog"
import type { VariableResolutionContext } from "@/features/templates/lib/variables"
import { Button } from "@/shared/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/Dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu"
import { useNavigate } from "@/shared/hooks/useNavigate"
import { toast } from "@/shared/hooks/useToast"
import type { CollapseSignal } from "../types"
import { TypeSection } from "./TypeSection"
import { SpaceSwitcher } from "./SpaceSwitcher"
import { RecentSection } from "./RecentSection"

const DRAG_TYPE = "OBJECT_TYPE"

interface DragItem {
  index: number
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/graph", label: "Graph", icon: NetworkIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

function DraggableTypeSection({
  index,
  type,
  objects,
  isLoading,
  hideCreateButton,
  collapseSignal,
  onCreateBlank,
  onSelectTemplate,
  onDelete,
  onMove,
  onDrop,
}: {
  index: number
  type: ObjectType
  objects: DataObjectSummary[]
  isLoading: boolean
  hideCreateButton?: boolean
  collapseSignal?: CollapseSignal
  onCreateBlank: (typeId: string) => Promise<void>
  onSelectTemplate: (template: Template) => Promise<void>
  onDelete: (typeId: string) => Promise<unknown>
  onMove: (from: number, to: number) => void
  onDrop: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Use refs so useDrag/useDrop specs never need to reconnect mid-drag
  const indexRef = useRef(index)
  const onMoveRef = useRef(onMove)
  const onDropRef = useRef(onDrop)

  useEffect(() => {
    indexRef.current = index
    onMoveRef.current = onMove
    onDropRef.current = onDrop
  }, [index, onMove, onDrop])

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: (): DragItem => ({ index: indexRef.current }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => onDropRef.current(),
  })

  const [, drop] = useDrop<DragItem>({
    accept: DRAG_TYPE,
    hover: (item, monitor) => {
      if (!ref.current) return
      const dragIndex = item.index
      const hoverIndex = indexRef.current
      if (dragIndex === hoverIndex) return

      const hoverRect = ref.current.getBoundingClientRect()
      const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset) return
      const hoverClientY = clientOffset.y - hoverRect.top

      // Only move when cursor crosses the midpoint
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      onMoveRef.current(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  useEffect(() => {
    drag(drop(ref))
  }, [drag, drop])

  return (
    <div ref={ref} className="cursor-grab [&_*]:cursor-grab">
      <TypeSection
        type={type}
        objects={objects}
        isLoading={isLoading}
        isDragging={isDragging}
        hideCreateButton={hideCreateButton}
        collapseSignal={collapseSignal}
        onCreateBlank={onCreateBlank}
        onSelectTemplate={onSelectTemplate}
        onDelete={onDelete}
      />
    </div>
  )
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span>{label}</span>
      <span className="flex items-center gap-0.5">
        {keys.map((k) => (
          <kbd
            key={k}
            className="inline-flex min-w-5 items-center justify-center rounded border bg-muted px-1 py-0.5 font-mono text-xs text-muted-foreground"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { push: navigate } = useNavigate()
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar()
  const isMobile = useIsMobile()
  const { user, isGuest } = useAuth()
  const { space } = useCurrentSpace()
  const { canEdit: canEditSpace, isOwner: isSpaceOwner } = useSpacePermission()
  const { filterTypes, filterObjects, isLoading: exclusionFilterLoading, isSharedUser } = useExclusionFilter()
  const { objects, isLoading: objectsLoading, create } = useObjects({
    parentId: null,
    isDeleted: false,
    isArchived: false,
  })
  // All non-deleted, non-archived objects — shared with PinnedSection + RecentSection via props
  const { objects: allObjects } = useObjects({ isDeleted: false, isArchived: false })
  const { types, create: createType, update: updateType, remove: removeType } = useObjectTypes()
  const { pinnedIds } = usePins()
  const { tags } = useTags()
  const { createFromTemplate, createFromTemplateWithVariables, getTemplateVariables } = useTemplates()
  const getNextTitle = useNextTitle()
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [variableDialogOpen, setVariableDialogOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<{ id: string; customVariables: string[] } | null>(null)
  const [orderedTypes, setOrderedTypes] = useState<ObjectType[]>(types)
  const [collapseSignal, setCollapseSignal] = useState<CollapseSignal | undefined>(undefined)
  const sidebarLoading = !space || (isSharedUser && exclusionFilterLoading)
  const orderedTypesRef = useRef(orderedTypes)
  orderedTypesRef.current = orderedTypes

  // Init recent-access store when space changes
  const initRecentAccess = useRecentAccess((s) => s.init)
  useEffect(() => {
    if (space) {
      initRecentAccess(space.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on space ID change
  }, [space?.id, initRecentAccess])

  // Keyboard shortcut: Cmd/Ctrl + \ to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isMobile) {
          setMobileOpen(!mobileOpen)
        } else {
          toggle()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, isMobile, mobileOpen, setMobileOpen])

  // Close mobile drawer on navigation
  useEffect(() => {
    if (isMobile && mobileOpen) {
      setMobileOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on pathname change
  }, [pathname])

  // Clear optimistic pending path when navigation completes
  const setPendingPath = useSidebar((s) => s.setPendingPath)
  useEffect(() => {
    setPendingPath(null)
  }, [pathname, setPendingPath])

  // Body scroll lock when mobile drawer is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isMobile, mobileOpen])

  // Sync orderedTypes when upstream types change.
  // Only reset order when types are added/removed — not when sort_order updates
  // come back from persistence, which would overwrite our optimistic local order.
  useEffect(() => {
    setOrderedTypes((prev) => {
      const prevIds = new Set(prev.map((t) => t.id))
      const nextIds = new Set(types.map((t) => t.id))
      const idsChanged =
        prevIds.size !== nextIds.size || types.some((t) => !prevIds.has(t.id))

      if (idsChanged) return types

      // Preserve local order, but pick up data changes (name, icon, etc.)
      return prev.map((pt) => types.find((t) => t.id === pt.id) ?? pt)
    })
  }, [types])

  const handleMoveType = useCallback((fromIndex: number, toIndex: number) => {
    setOrderedTypes((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const handleDropType = useCallback(() => {
    orderedTypesRef.current.forEach((t, i) => {
      if (t.sort_order !== i) {
        updateType(t.id, { sort_order: i })
      }
    })
  }, [updateType])

  // Compute archived type IDs to hide their entries from flat views
  const archivedTypeIds = useMemo(() => new Set(types.filter(t => t.is_archived).map(t => t.id)), [types])

  const filteredOrderedTypes = useMemo(() =>
    filterTypes(orderedTypes).filter(t => !t.is_archived),
    [filterTypes, orderedTypes]
  )

  const objectsByType = useMemo(() => {
    const filtered = filterObjects(objects)
    const grouped = new Map<string, DataObjectSummary[]>()
    for (const obj of filtered) {
      const existing = grouped.get(obj.type_id) ?? []
      existing.push(obj)
      grouped.set(obj.type_id, existing)
    }
    return grouped
  }, [objects, filterObjects])

  // Filter out objects whose type is archived for flat views (pinned, recent)
  const visibleAllObjects = useMemo(() =>
    allObjects.filter(obj => !archivedTypeIds.has(obj.type_id)),
    [allObjects, archivedTypeIds]
  )

  const handleCreateBlank = async (typeId: string) => {
    const typeDef = types.find(t => t.id === typeId)
    const result = await create({
      title: typeDef ? getNextTitle(typeId, typeDef.name) : 'Untitled',
      type_id: typeId,
    })
    if (result) {
      navigate(`/objects/${result.id}?new=1`)
    } else {
      toast({ description: 'Failed to create entry. You may not have permission.', variant: 'destructive' })
    }
  }

  const buildResolutionContext = useCallback((): VariableResolutionContext => ({
    userName: user?.email ?? null,
    spaceName: space?.name ?? null,
  }), [user, space])

  const handleSelectTemplate = async (template: Template) => {
    const info = await getTemplateVariables(template.id)

    if (info && info.customVariables.length > 0) {
      setPendingTemplate({ id: template.id, customVariables: info.customVariables })
      setVariableDialogOpen(true)
      return
    }

    // No custom variables — resolve built-ins inline if any, otherwise plain copy
    if (info && info.hasVariables) {
      const result = await createFromTemplateWithVariables(template.id, {}, buildResolutionContext())
      if (result) {
        navigate(`/objects/${result.id}?new=1`)
      }
    } else {
      const result = await createFromTemplate(template.id)
      if (result) {
        navigate(`/objects/${result.id}?new=1`)
      }
    }
  }

  const handleVariableSubmit = async (values: Record<string, string>) => {
    if (!pendingTemplate) return
    setVariableDialogOpen(false)
    const result = await createFromTemplateWithVariables(
      pendingTemplate.id,
      values,
      buildResolutionContext(),
    )
    setPendingTemplate(null)
    if (result) {
      navigate(`/objects/${result.id}?new=1`)
    }
  }

  // Determine which sections have visible content for conditional separators
  const hasPinnedContent = pinnedIds.size > 0 && visibleAllObjects.some(obj => pinnedIds.has(obj.id))
  const hasRecentContent = visibleAllObjects.length > 0
  const hasTagsContent = tags.length > 0

  const [allCollapsed, setAllCollapsed] = useState(false)

  const handleToggleAll = useCallback(() => {
    setAllCollapsed((prev) => {
      const next = !prev
      setCollapseSignal((s) => ({ collapsed: next, key: (s?.key ?? 0) + 1 }))
      return next
    })
  }, [])

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex h-14 items-center border-b px-2">
        {/* Desktop collapsed: expand button */}
        {collapsed && (
          <button
            onClick={toggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="hidden md:flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mx-auto"
          >
            <PanelLeftOpenIcon className="size-4" />
          </button>
        )}
        {/* Space switcher + action buttons (always rendered for stable Radix IDs) */}
        <div className={cn("flex flex-1 items-center min-w-0", collapsed && "md:hidden")}>
          <SpaceSwitcher />
          {isGuest && (
            <span className="ml-1 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
              Guest
            </span>
          )}
          {/* Mobile: close button */}
          <button
            onClick={() => setMobileOpen(false)}
            title="Close sidebar"
            aria-label="Close sidebar"
            className="ml-auto flex size-10 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors md:hidden"
          >
            <XIcon className="size-5" />
          </button>
          {/* Desktop: collapse button */}
          <button
            onClick={toggle}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="ml-auto hidden size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors md:flex"
          >
            <PanelLeftCloseIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b">
        <nav
          className={cn(
            "flex items-center px-2 py-2 mx-auto max-w-40 justify-between",
            collapsed && "md:flex-col md:gap-1 md:mx-0 md:max-w-none md:justify-start"
          )}
        >
          {navItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={(isActive) => cn(
                  "flex size-10 min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 items-center justify-center rounded-md transition-colors md:size-8",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="size-5 md:size-4" />
              </SidebarLink>
          ))}
        </nav>
      </div>

      {/* Scrollable content — always rendered, faded out when collapsed (desktop only) */}
      <DndProvider backend={HTML5Backend}>
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            collapsed && "md:overflow-hidden"
          )}
        >
          <div className={cn(
            "w-64 space-y-3 p-2 transition-transform duration-200",
            collapsed && "md:-translate-x-full"
          )}>
            {sidebarLoading ? (
              <div aria-busy="true" aria-label="Loading sidebar content" role="status">
                {/* Skeleton section 1 */}
                <div className="p-2">
                  <div className="mb-1 flex items-center gap-1">
                    <div className="size-3 animate-pulse rounded bg-muted" />
                    <div className="size-3.5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="space-y-0.5 pl-8">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-7 animate-pulse rounded-md bg-muted" />
                    ))}
                  </div>
                </div>
                <hr className="border-border" />
                {/* Skeleton section 2 */}
                <div className="p-2">
                  <div className="mb-1 flex items-center gap-1">
                    <div className="size-3 animate-pulse rounded bg-muted" />
                    <div className="size-3.5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="space-y-0.5 pl-8">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-7 animate-pulse rounded-md bg-muted" />
                    ))}
                  </div>
                </div>
                <hr className="border-border" />
                {/* Skeleton recent section */}
                <div className="p-2">
                  <div className="mb-1 flex items-center gap-1">
                    <div className="size-3 animate-pulse rounded bg-muted" />
                    <div className="size-3.5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-14 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="space-y-0.5 pl-8">
                    {[1, 2].map(i => (
                      <div key={i} className="h-7 animate-pulse rounded-md bg-muted" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-end pr-2" role="toolbar" aria-label="Section controls">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title={allCollapsed ? "Expand all sections" : "Collapse all sections"}
                    aria-label={allCollapsed ? "Expand all sections" : "Collapse all sections"}
                    onClick={handleToggleAll}
                  >
                    {allCollapsed
                      ? <ListChevronsUpDownIcon className="size-3" />
                      : <ListChevronsDownUpIcon className="size-3" />}
                  </Button>
                </div>
                <PinnedSection pinnedIds={pinnedIds} objects={visibleAllObjects} collapseSignal={collapseSignal} />
                {hasPinnedContent && <hr className="border-border" />}
                {filteredOrderedTypes.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-medium text-muted-foreground">No types yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">Create a type to start organizing your entries</p>
                    {canEditSpace && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 gap-1 text-xs text-muted-foreground"
                        onClick={() => setCreateTypeOpen(true)}
                      >
                        <PlusIcon className="size-3" />
                        New Type
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredOrderedTypes.map((type, index) =>
                    isSpaceOwner ? (
                      <DraggableTypeSection
                        key={type.id}
                        index={index}
                        type={type}
                        objects={objectsByType.get(type.id) ?? []}
                        isLoading={objectsLoading}
                        hideCreateButton={!canEditSpace}
                        collapseSignal={collapseSignal}
                        onCreateBlank={handleCreateBlank}
                        onSelectTemplate={handleSelectTemplate}
                        onDelete={removeType}
                        onMove={handleMoveType}
                        onDrop={handleDropType}
                      />
                    ) : (
                      <TypeSection
                        key={type.id}
                        type={type}
                        objects={objectsByType.get(type.id) ?? []}
                        isLoading={objectsLoading}
                        hideCreateButton={!canEditSpace}
                        hideManageActions
                        collapseSignal={collapseSignal}
                        onCreateBlank={handleCreateBlank}
                        onSelectTemplate={handleSelectTemplate}
                      />
                    )
                  )
                )}
                {canEditSpace && filteredOrderedTypes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-1 text-xs text-muted-foreground"
                    onClick={() => setCreateTypeOpen(true)}
                  >
                    <PlusIcon className="size-3" />
                    New Type
                  </Button>
                )}
                {hasRecentContent && <hr className="border-border" />}
                <RecentSection objects={visibleAllObjects} collapseSignal={collapseSignal} />
                {hasTagsContent && <hr className="border-border" />}
                <TagsSection tags={tags} collapseSignal={collapseSignal} />
                <hr className="border-border" />
                <SidebarLink
                  href="/archive"
                  className={(isActive) => cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <ArchiveIcon className="size-4" />
                  Archive
                </SidebarLink>
                <SidebarLink
                  href="/trash"
                  className={(isActive) => cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <TrashIcon className="size-4" />
                  Trash
                </SidebarLink>
              </>
            )}
          </div>
        </div>
      </DndProvider>
      {/* Help menu */}
      <div className="border-t p-2 flex justify-center">
        <Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Help"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <HelpCircleIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem asChild>
                <a
                  href="https://docs.swashbuckler.quest"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpenIcon className="size-4" />
                  Documentation
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DialogTrigger asChild>
                <DropdownMenuItem>
                  <KeyboardIcon className="size-4" />
                  Keyboard shortcuts
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Keyboard shortcuts</DialogTitle>
              <DialogDescription className="sr-only">
                A reference of available keyboard shortcuts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="mb-1.5 font-medium text-muted-foreground">General</h4>
                <div className="space-y-1">
                  <ShortcutRow keys={["⌘", "K"]} label="Search" />
                  <ShortcutRow keys={["⌘", "E"]} label="Quick capture" />
                  <ShortcutRow keys={["⌘", "\\"]} label="Toggle sidebar" />
                </div>
              </div>
              <div>
                <h4 className="mb-1.5 font-medium text-muted-foreground">Editor</h4>
                <div className="space-y-1">
                  <ShortcutRow keys={["/"]} label="Slash commands" />
                  <ShortcutRow keys={["[["]} label="Link to object" />
                  <ShortcutRow keys={["⌘", "Enter"]} label="Exit block" />
                </div>
              </div>
              <div>
                <h4 className="mb-1.5 font-medium text-muted-foreground">Markdown</h4>
                <div className="space-y-1">
                  <ShortcutRow keys={["#"]} label="Heading" />
                  <ShortcutRow keys={[">"]} label="Quote" />
                  <ShortcutRow keys={["-"]} label="Bullet list" />
                  <ShortcutRow keys={["1."]} label="Numbered list" />
                  <ShortcutRow keys={["```"]} label="Code block" />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <CreateTypeDialog
        open={createTypeOpen}
        onOpenChange={setCreateTypeOpen}
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

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        {...(isMobile ? { role: "dialog", "aria-modal": true, "aria-label": "Navigation sidebar" } : {})}
        className={cn(
          "flex flex-col border-r bg-muted/30 transition-all duration-200",
          // Mobile: fixed drawer
          isMobile
            ? cn(
                "fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-sm transition-transform",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              )
            // Desktop: standard sidebar
            : cn(
                "h-screen overflow-hidden",
                collapsed ? "w-12" : "w-64"
              )
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
