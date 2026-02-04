"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/shared/lib/supabase/client"
import { Button } from "@/shared/components/ui/Button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu"
import { Avatar, AvatarFallback } from "@/shared/components/ui/Avatar"
import { LogOutIcon, UserIcon } from "lucide-react"

export function Header({ email }: { email?: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : "U"

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled>
            <UserIcon className="size-4" />
            {email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOutIcon className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
