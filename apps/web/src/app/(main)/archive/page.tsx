import { ArchiveList } from '@/features/objects/components/ArchiveList'

export default function ArchivePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Archive</h1>
        <p className="text-muted-foreground">
          Archived items are hidden from normal views. Unarchive to restore them.
        </p>
      </div>

      <ArchiveList />
    </div>
  )
}
