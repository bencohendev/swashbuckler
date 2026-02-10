"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { HomeIcon, NetworkIcon, PlusIcon, SettingsIcon, TrashIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useAuth, BUILT_IN_TYPE_IDS } from "@/shared/lib/data"
import type { DataObject, ObjectType, Template } from "@/shared/lib/data"
import { useObjects } from "@/features/objects/hooks"
import { useTemplates } from "@/features/templates"
import { useObjectTypes, CreateTypeDialog } from "@/features/object-types"
import { Button } from "@/shared/components/ui/Button"
import { TypeSection } from "./TypeSection"

const DRAG_TYPE = "OBJECT_TYPE"

interface DragItem {
  index: number
}

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/graph", label: "Graph", icon: NetworkIcon },
  { href: "/trash", label: "Trash", icon: TrashIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

function DraggableTypeSection({
  index,
  type,
  objects,
  onCreateBlank,
  onSelectTemplate,
  onMove,
  onDrop,
}: {
  index: number
  type: ObjectType
  objects: DataObject[]
  onCreateBlank: (typeId: string) => Promise<void>
  onSelectTemplate: (template: Template) => Promise<void>
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
        onCreateBlank={onCreateBlank}
        onSelectTemplate={onSelectTemplate}
      />
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isGuest } = useAuth()
  const { objects, isLoading: objectsLoading, create } = useObjects({
    parentId: null,
    isDeleted: false,
  })
  const { types, isLoading: typesLoading, create: createType, update: updateType } = useObjectTypes()
  const { createFromTemplate } = useTemplates()
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [orderedTypes, setOrderedTypes] = useState<ObjectType[]>(types)
  const orderedTypesRef = useRef(orderedTypes)
  orderedTypesRef.current = orderedTypes

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

  const objectsByType = useMemo(() => {
    const grouped = new Map<string, DataObject[]>()
    for (const obj of objects) {
      const existing = grouped.get(obj.type_id) ?? []
      existing.push(obj)
      grouped.set(obj.type_id, existing)
    }
    return grouped
  }, [objects])

  const handleCreateBlank = async (typeId: string) => {
    const typeDef = types.find(t => t.id === typeId)
    const defaultTitle = typeId === BUILT_IN_TYPE_IDS.note ? 'Untitled Note' : 'Untitled'
    const result = await create({
      title: typeDef ? `Untitled ${typeDef.name}` : defaultTitle,
      type_id: typeId,
    })
    if (result) {
      router.push(`/objects/${result.id}`)
    }
  }

  const handleSelectTemplate = async (template: Template) => {
    const result = await createFromTemplate(template.id)
    if (result) {
      router.push(`/objects/${result.id}`)
    }
  }

  const isLoading = objectsLoading || typesLoading

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/" className="font-semibold">
          Swashbuckler
        </Link>
        {isGuest && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
            Guest
          </span>
        )}
      </div>
      <nav className="space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <DndProvider backend={HTML5Backend}>
        <div className="flex-1 space-y-3 overflow-auto border-t p-2">
          {isLoading ? (
            <div className="space-y-2 px-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <>
              {orderedTypes.map((type, index) => (
                <DraggableTypeSection
                  key={type.id}
                  index={index}
                  type={type}
                  objects={objectsByType.get(type.id) ?? []}
                  onCreateBlank={handleCreateBlank}
                  onSelectTemplate={handleSelectTemplate}
                  onMove={handleMoveType}
                  onDrop={handleDropType}
                />
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-1 text-xs text-muted-foreground"
                onClick={() => setCreateTypeOpen(true)}
              >
                <PlusIcon className="size-3" />
                New Type
              </Button>
            </>
          )}
        </div>
      </DndProvider>
      <CreateTypeDialog
        open={createTypeOpen}
        onOpenChange={setCreateTypeOpen}
        onCreate={createType}
      />
    </aside>
  )
}
