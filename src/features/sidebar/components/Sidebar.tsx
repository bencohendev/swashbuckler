"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { HomeIcon, NetworkIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon, SettingsIcon, TrashIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useSidebar } from "@/shared/stores/sidebar"
import { useAuth, useCurrentSpace } from "@/shared/lib/data"
import type { DataObject, ObjectType, Template } from "@/shared/lib/data"
import { useObjects } from "@/features/objects/hooks"
import { useTemplates } from "@/features/templates"
import { useObjectTypes, CreateTypeDialog } from "@/features/object-types"
import { useSpacePermission, useExclusionFilter } from "@/features/sharing"
import { TagsSection } from "@/features/tags"
import { PinnedSection } from "@/features/pins"
import { VariablePromptDialog } from "@/features/templates/components/VariablePromptDialog"
import type { VariableResolutionContext } from "@/features/templates/lib/variables"
import { Button } from "@/shared/components/ui/Button"
import { TypeSection } from "./TypeSection"
import { SpaceSwitcher } from "./SpaceSwitcher"
import { RecentSection } from "./RecentSection"

const DRAG_TYPE = "OBJECT_TYPE"

interface DragItem {
  index: number
}

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/graph", label: "Graph", icon: NetworkIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

function DraggableTypeSection({
  index,
  type,
  objects,
  hideCreateButton,
  onCreateBlank,
  onSelectTemplate,
  onDelete,
  onMove,
  onDrop,
}: {
  index: number
  type: ObjectType
  objects: DataObject[]
  hideCreateButton?: boolean
  onCreateBlank: (typeId: string) => Promise<void>
  onSelectTemplate: (template: Template) => Promise<void>
  onDelete: (typeId: string) => Promise<void>
  onMove: (from: number, to: number) => void
  onDrop: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Use refs so useDrag/useDrop specs never need to reconnect mid-drag
  const indexRef = useRef(index)
  indexRef.current = index
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

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

  drag(drop(ref))

  return (
    <div ref={ref} className="cursor-grab [&_*]:cursor-grab">
      <TypeSection
        type={type}
        objects={objects}
        isLoading={false}
        isDragging={isDragging}
        hideCreateButton={hideCreateButton}
        onCreateBlank={onCreateBlank}
        onSelectTemplate={onSelectTemplate}
        onDelete={onDelete}
      />
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, toggle } = useSidebar()
  const { user, isGuest } = useAuth()
  const { space } = useCurrentSpace()
  const { canEdit: canEditSpace, isOwner: isSpaceOwner } = useSpacePermission()
  const { filterTypes, filterObjects } = useExclusionFilter()
  const { objects, isLoading: objectsLoading, create } = useObjects({
    parentId: null,
    isDeleted: false,
  })
  const { types, isLoading: typesLoading, create: createType, update: updateType, remove: removeType } = useObjectTypes()
  const { createFromTemplate, createFromTemplateWithVariables, getTemplateVariables } = useTemplates()
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [variableDialogOpen, setVariableDialogOpen] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<{ id: string; customVariables: string[] } | null>(null)
  const [orderedTypes, setOrderedTypes] = useState<ObjectType[]>(types)
  const orderedTypesRef = useRef(orderedTypes)
  orderedTypesRef.current = orderedTypes

  // Keyboard shortcut: Cmd/Ctrl + \ to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

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

  const filteredOrderedTypes = useMemo(() => filterTypes(orderedTypes), [filterTypes, orderedTypes])

  const objectsByType = useMemo(() => {
    const filtered = filterObjects(objects)
    const grouped = new Map<string, DataObject[]>()
    for (const obj of filtered) {
      const existing = grouped.get(obj.type_id) ?? []
      existing.push(obj)
      grouped.set(obj.type_id, existing)
    }
    return grouped
  }, [objects, filterObjects])

  const handleCreateBlank = async (typeId: string) => {
    const typeDef = types.find(t => t.id === typeId)
    const result = await create({
      title: typeDef ? `Untitled ${typeDef.name}` : 'Untitled',
      type_id: typeId,
    })
    if (result) {
      router.push(`/objects/${result.id}`)
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
        router.push(`/objects/${result.id}`)
      }
    } else {
      const result = await createFromTemplate(template.id)
      if (result) {
        router.push(`/objects/${result.id}`)
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
      router.push(`/objects/${result.id}`)
    }
  }

  const isLoading = objectsLoading || typesLoading

  return (
    <aside
      className={cn(
        "flex h-screen flex-col overflow-hidden border-r bg-muted/30 transition-[width] duration-200",
        collapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b px-2">
        {collapsed ? (
          <button
            onClick={toggle}
            title="Expand sidebar"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mx-auto"
          >
            <PanelLeftOpenIcon className="size-4" />
          </button>
        ) : (
          <>
            <SpaceSwitcher />
            {isGuest && (
              <span className="ml-1 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                Guest
              </span>
            )}
            <button
              onClick={toggle}
              title="Collapse sidebar"
              className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <PanelLeftCloseIcon className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="border-b">
        <nav
          className={cn(
            "flex items-center px-2 py-2",
            collapsed ? "flex-col gap-1" : "mx-auto max-w-40 justify-between"
          )}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Scrollable content — always rendered, faded out when collapsed */}
      <DndProvider backend={HTML5Backend}>
        <div className={cn(
          "flex-1",
          collapsed ? "overflow-hidden" : "overflow-y-auto"
        )}>
          <div className={cn(
            "w-64 space-y-3 p-2 transition-transform duration-200",
            collapsed ? "-translate-x-full" : "translate-x-0"
          )}>
            {isLoading ? (
              <div className="space-y-2 px-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : (
              <>
                <PinnedSection />
                <hr className="border-border" />
                {filteredOrderedTypes.map((type, index) => (
                  <DraggableTypeSection
                    key={type.id}
                    index={index}
                    type={type}
                    objects={objectsByType.get(type.id) ?? []}
                    hideCreateButton={!canEditSpace}
                    onCreateBlank={handleCreateBlank}
                    onSelectTemplate={handleSelectTemplate}
                    onDelete={removeType}
                    onMove={handleMoveType}
                    onDrop={handleDropType}
                  />
                ))}
                {isSpaceOwner && (
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
                <hr className="border-border" />
                <RecentSection />
                <hr className="border-border" />
                <TagsSection />
                <hr className="border-border" />
                <Link
                  href="/trash"
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    pathname === "/trash"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <TrashIcon className="size-4" />
                  Trash
                </Link>
              </>
            )}
          </div>
        </div>
      </DndProvider>
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
    </aside>
  )
}
