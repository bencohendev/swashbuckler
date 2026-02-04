"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { HomeIcon, NetworkIcon, SettingsIcon, TrashIcon, PlusIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useAuth } from "@/shared/lib/data"
import { useObjects } from "@/features/objects/hooks"
import { ObjectList } from "@/features/objects/components"
import { Button } from "@/shared/components/ui/Button"

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
  const { objects, isLoading, create } = useObjects({
    parentId: null,
    isDeleted: false,
  })

  const handleCreatePage = async () => {
    const result = await create({
      title: "Untitled",
      type: "page",
    })
    if (result) {
      router.push(`/objects/${result.id}`)
    }
  }

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
      <div className="flex-1 overflow-auto border-t p-2">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-xs font-medium text-muted-foreground">Pages</span>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={handleCreatePage}
            title="Create new page"
          >
            <PlusIcon className="size-3" />
          </Button>
        </div>
        <ObjectList
          objects={objects}
          isLoading={isLoading}
          emptyMessage="No pages yet"
          compact
        />
      </div>
    </aside>
  )
}
