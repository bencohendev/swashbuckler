"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HomeIcon, NetworkIcon, SettingsIcon, TrashIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/graph", label: "Graph", icon: NetworkIcon },
  { href: "/trash", label: "Trash", icon: TrashIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="font-semibold">
          Swashbuckler
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
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
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          Objects will appear here
        </p>
      </div>
    </aside>
  )
}
