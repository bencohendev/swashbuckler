"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/Dialog"
import { Button } from "@/shared/components/ui/Button"
import { Input } from "@/shared/components/ui/Input"
import { Label } from "@/shared/components/ui/Label"
import { EmojiPicker } from "@/shared/components/EmojiPicker"
import { StarterKitSelector } from "@/features/starter-kits/components/StarterKitSelector"
import type { Space } from "@/shared/lib/data/types"

type TypeSource = 'empty' | 'copy' | 'kit'

export interface CreateSpaceInput {
  name: string
  icon?: string
  copyTypesFromSpaceId?: string
  includeTemplates?: boolean
  starterKitId?: string
}

interface CreateSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateSpaceInput) => Promise<{ data: unknown; error?: string }>
  spaces?: Space[]
}

export function CreateSpaceDialog({ open, onOpenChange, onCreate, spaces = [] }: CreateSpaceDialogProps) {
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("📁")
  const [typeSource, setTypeSource] = useState<TypeSource>('empty')
  const [copyFromSpaceId, setCopyFromSpaceId] = useState("")
  const [includeTemplates, setIncludeTemplates] = useState(false)
  const [starterKitId, setStarterKitId] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsCreating(true)
    setError(null)
    const result = await onCreate({
      name: name.trim(),
      icon,
      copyTypesFromSpaceId: typeSource === 'copy' && copyFromSpaceId ? copyFromSpaceId : undefined,
      includeTemplates: typeSource === 'copy' && copyFromSpaceId ? includeTemplates : undefined,
      starterKitId: typeSource === 'kit' && starterKitId ? starterKitId : undefined,
    })
    setIsCreating(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setName("")
    setIcon("📁")
    setTypeSource('empty')
    setCopyFromSpaceId("")
    setIncludeTemplates(false)
    setStarterKitId("")
    setError(null)
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Space</DialogTitle>
          <DialogDescription>
            Create a new space to organize your content.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              placeholder="My Space"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <EmojiPicker value={icon} onChange={setIcon}>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-md border text-lg transition-colors hover:bg-accent"
              >
                {icon}
              </button>
            </EmojiPicker>
          </div>
          <fieldset className="space-y-2">
            <Label asChild><legend>Types</legend></Label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type-source"
                  value="empty"
                  checked={typeSource === 'empty'}
                  onChange={() => setTypeSource('empty')}
                  className="size-3.5"
                />
                Start empty
              </label>
              {spaces.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="type-source"
                    value="copy"
                    checked={typeSource === 'copy'}
                    onChange={() => setTypeSource('copy')}
                    className="size-3.5"
                  />
                  Copy from existing space
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type-source"
                  value="kit"
                  checked={typeSource === 'kit'}
                  onChange={() => setTypeSource('kit')}
                  className="size-3.5"
                />
                Use a starter kit
              </label>
            </div>
            {typeSource === 'copy' && spaces.length > 0 && (
              <div className="space-y-2 pl-6">
                <select
                  id="copy-types-from"
                  value={copyFromSpaceId}
                  onChange={(e) => {
                    setCopyFromSpaceId(e.target.value)
                    if (!e.target.value) setIncludeTemplates(false)
                  }}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                  aria-label="Space to copy types from"
                >
                  <option value="">Select a space…</option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
                {copyFromSpaceId && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={includeTemplates}
                      onChange={(e) => setIncludeTemplates(e.target.checked)}
                      className="size-3.5"
                    />
                    Include templates
                  </label>
                )}
              </div>
            )}
            {typeSource === 'kit' && (
              <div className="pl-6">
                <StarterKitSelector value={starterKitId} onChange={setStarterKitId} />
              </div>
            )}
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
