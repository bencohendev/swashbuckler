"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, ChevronsUpDownIcon, LogOutIcon, PlusIcon, ShareIcon } from "lucide-react"
import { useCurrentSpace, useSpaces, useAuth } from "@/shared/lib/data"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/DropdownMenu"
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog"
import { toast } from "@/shared/hooks/useToast"
import { CreateSpaceDialog } from "./CreateSpaceDialog"
import { ShareSpaceDialog } from "@/features/sharing"

export function SpaceSwitcher() {
  const router = useRouter()
  const { space, spaces, switchSpace, leaveSpace } = useCurrentSpace()
  const { create } = useSpaces()
  const { user } = useAuth()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)

  const handleSwitchSpace = (id: string) => {
    if (id === space?.id) return
    switchSpace(id)
    router.push('/')
  }

  const handleCreate = async (input: { name: string; icon?: string }) => {
    const result = await create(input)
    if (result.data) {
      handleSwitchSpace(result.data.id)
    }
    return result
  }

  const isOwned = (s: { owner_id: string }) => !user || s.owner_id === user.id
  const ownedSpaces = spaces.filter(s => isOwned(s))
  const sharedSpaces = spaces.filter(s => !isOwned(s))

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent transition-colors outline-none">
          <span className="text-base">{space?.icon ?? "📁"}</span>
          <span className="flex-1 truncate text-sm font-semibold">
            {space?.name ?? "Select Space"}
          </span>
          {space && !isOwned(space) && (
            <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              Shared
            </span>
          )}
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {[
            ...ownedSpaces.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => handleSwitchSpace(s.id)}
                className="gap-2"
              >
                <span className="text-base">{s.icon}</span>
                <span className="flex-1 truncate">{s.name}</span>
                {s.id === space?.id && (
                  <CheckIcon className="size-4 text-primary" />
                )}
              </DropdownMenuItem>
            )),
            ...(sharedSpaces.length > 0 ? [
              <DropdownMenuSeparator key="__shared-sep" />,
              <div key="__shared-label" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Shared with you
              </div>,
              ...sharedSpaces.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => handleSwitchSpace(s.id)}
                  className="gap-2"
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    Shared
                  </span>
                  {s.id === space?.id && (
                    <CheckIcon className="size-4 text-primary" />
                  )}
                </DropdownMenuItem>
              )),
            ] : []),
            <DropdownMenuSeparator key="__actions-sep" />,
            ...(space && isOwned(space) ? [
              <DropdownMenuItem
                key="__share"
                onClick={() => setShareDialogOpen(true)}
                className="gap-2"
              >
                <ShareIcon className="size-4" />
                Share Space
              </DropdownMenuItem>,
            ] : []),
            ...(space && !isOwned(space) ? [
              <DropdownMenuItem
                key="__leave"
                onClick={() => setConfirmLeaveOpen(true)}
                className="gap-2 text-destructive"
              >
                <LogOutIcon className="size-4" />
                Leave Space
              </DropdownMenuItem>,
            ] : []),
            <DropdownMenuItem
              key="__new"
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2"
            >
              <PlusIcon className="size-4" />
              New Space
            </DropdownMenuItem>,
          ]}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateSpaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
      />
      {space && (
        <ShareSpaceDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          spaceId={space.id}
          spaceName={space.name}
        />
      )}
      {space && (
        <ConfirmDialog
          open={confirmLeaveOpen}
          onOpenChange={setConfirmLeaveOpen}
          title="Leave space"
          description={`Leave "${space.name}"? You will lose access.`}
          confirmLabel="Leave"
          destructive
          onConfirm={async () => {
            await leaveSpace(space.id)
            toast({ description: `Left "${space.name}"`, variant: 'success' })
            router.push('/')
          }}
        />
      )}
    </>
  )
}
