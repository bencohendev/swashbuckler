"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { HomeIcon, NetworkIcon, PlusIcon, SettingsIcon, TrashIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useAuth, BUILT_IN_TYPE_IDS } from "@/shared/lib/data"
import type { DataObject, Template } from "@/shared/lib/data"
import { useObjects } from "@/features/objects/hooks"
import { useTemplates } from "@/features/templates"
import { useObjectTypes, CreateTypeDialog } from "@/features/object-types"
import { Button } from "@/shared/components/ui/Button"
import { TypeSection } from "./TypeSection"

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/graph", label: "Graph", icon: NetworkIcon },
  { href: "/trash", label: "Trash", icon: TrashIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { isGuest } = useAuth()
  const { objects, isLoading: objectsLoading, create } = useObjects({
    parentId: null,
    isDeleted: false,
  })
  const { types, isLoading: typesLoading, create: createType } = useObjectTypes()
  const { createFromTemplate } = useTemplates()
  const [createTypeOpen, setCreateTypeOpen] = useState(false)

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
      <div className="flex-1 space-y-3 overflow-auto border-t p-2">
        {isLoading ? (
          <div className="space-y-2 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : (
          <>
            {types.map((type) => (
              <TypeSection
                key={type.id}
                type={type}
                objects={objectsByType.get(type.id) ?? []}
                isLoading={false}
                onCreateBlank={handleCreateBlank}
                onSelectTemplate={handleSelectTemplate}
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
      <CreateTypeDialog
        open={createTypeOpen}
        onOpenChange={setCreateTypeOpen}
        onCreate={createType}
      />
    </aside>
  )
}
