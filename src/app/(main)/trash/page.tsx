import { TrashList } from '@/features/objects/components/TrashList'

export default function TrashPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trash</h1>
        <p className="text-muted-foreground">
          Items in trash will be permanently deleted after 30 days.
        </p>
      </div>

      <TrashList />
    </div>
  )
}
