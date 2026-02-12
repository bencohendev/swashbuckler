'use client'

import { Button } from '@/shared/components/ui/Button'
import { DownloadIcon } from 'lucide-react'
import { useAccountExport } from '../hooks/useAccountExport'

export function DataExportSection() {
  const { exportData, isExporting, error } = useAccountExport()

  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-2 text-lg font-semibold">Export data</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Download all your data as a JSON file. This includes all spaces, objects, types, templates, relations, and tags.
      </p>
      <Button variant="outline" size="sm" onClick={exportData} disabled={isExporting}>
        <DownloadIcon className="size-4" />
        {isExporting ? 'Exporting...' : 'Export all data'}
      </Button>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  )
}
