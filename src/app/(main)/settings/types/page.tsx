import { ObjectTypeManager } from '@/features/object-types'

export default function TypesSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Types</h1>
        <p className="text-muted-foreground">
          Customize your types and their properties.
        </p>
      </div>
      <ObjectTypeManager />
    </div>
  )
}
