'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, Loader2Icon, PackageIcon } from 'lucide-react'
import { STARTER_KITS, type StarterKit } from '../data/kits'
import { useImportKit } from '../hooks/useImportKit'
import { Button } from '@/shared/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'
import { toast } from '@/shared/hooks/useToast'

function groupByCategory(kits: StarterKit[]): Map<string, StarterKit[]> {
  const groups = new Map<string, StarterKit[]>()
  for (const kit of kits) {
    const existing = groups.get(kit.category)
    if (existing) {
      existing.push(kit)
    } else {
      groups.set(kit.category, [kit])
    }
  }
  return groups
}

function KitRow({ kit, onImport, isImporting }: {
  kit: StarterKit
  onImport: (kit: StarterKit) => void
  isImporting: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between p-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-3 text-left"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${kit.name} details`}
        >
          <span className="text-lg" role="img" aria-label={kit.name}>{kit.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{kit.name}</p>
            <p className="text-xs text-muted-foreground">{kit.description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {kit.types.length} type{kit.types.length !== 1 ? 's' : ''}
          </span>
          {expanded ? (
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        <Button
          size="sm"
          variant="outline"
          className="ml-3 shrink-0"
          disabled={isImporting}
          onClick={() => onImport(kit)}
        >
          {isImporting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            'Import'
          )}
        </Button>
      </div>
      {expanded && (
        <div className="border-t px-3 py-2">
          <ul className="space-y-1" role="list">
            {kit.types.map((type) => (
              <li key={type.slug} className="flex items-center gap-2 text-sm">
                <span role="img" aria-label={type.name}>{type.icon}</span>
                <span>{type.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({type.fields.length} field{type.fields.length !== 1 ? 's' : ''})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function StarterKitBrowser() {
  const [open, setOpen] = useState(false)
  const { importStarterKit } = useImportKit()
  const [importingKitId, setImportingKitId] = useState<string | null>(null)

  const grouped = groupByCategory(STARTER_KITS)

  const handleImport = async (kit: StarterKit) => {
    setImportingKitId(kit.id)
    const result = await importStarterKit(kit)
    setImportingKitId(null)

    if (result.errors.length > 0) {
      toast({
        description: `Errors importing ${kit.name}: ${result.errors.join(', ')}`,
        variant: 'destructive',
      })
      return
    }

    let description: string
    if (result.created.length > 0 && result.skipped.length > 0) {
      description = `Imported ${kit.name} kit: ${result.created.join(', ')} (skipped ${result.skipped.join(', ')} — already exist)`
    } else if (result.created.length > 0) {
      description = `Imported ${kit.name} kit: ${result.created.join(', ')}`
    } else {
      description = `All types from ${kit.name} already exist`
    }

    toast({
      description,
      variant: result.created.length > 0 ? 'success' : 'default',
    })

    if (result.created.length > 0) {
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <PackageIcon className="size-4" />
        Starter Kits
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Starter Kits</DialogTitle>
            <DialogDescription>
              Import a pre-built set of types to get started quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 space-y-4 overflow-y-auto">
            {Array.from(grouped.entries()).map(([category, kits]) => (
              <div key={category}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {category}
                </h3>
                <div className="space-y-2">
                  {kits.map((kit) => (
                    <KitRow
                      key={kit.id}
                      kit={kit}
                      onImport={handleImport}
                      isImporting={importingKitId === kit.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
