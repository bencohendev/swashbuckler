"use client"

import { useState } from "react"
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react"
import { useCurrentSpace, useSpaces } from "@/shared/lib/data"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu"
import { CreateSpaceDialog } from "./CreateSpaceDialog"

export function SpaceSwitcher() {
  const { space, spaces, switchSpace } = useCurrentSpace()
  const { create } = useSpaces()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const handleCreate = async (input: { name: string; icon?: string }) => {
    const newSpace = await create(input)
    if (newSpace) {
      switchSpace(newSpace.id)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent transition-colors outline-none">
          <span className="text-base">{space?.icon ?? "📁"}</span>
          <span className="flex-1 truncate text-sm font-semibold">
            {space?.name ?? "Select Space"}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {spaces.map((s) => (
            <DropdownMenuItem
              key={s.id}
              onClick={() => switchSpace(s.id)}
              className="gap-2"
            >
              <span className="text-base">{s.icon}</span>
              <span className="flex-1 truncate">{s.name}</span>
              {s.id === space?.id && (
                <CheckIcon className="size-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2"
          >
            <PlusIcon className="size-4" />
            New Space
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateSpaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
      />
    </>
  )
}
