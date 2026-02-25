import { TemplateList } from '@/features/templates'

export default function TemplatesSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-muted-foreground">
          Manage your templates. Templates can be used as starting points when creating new entries.
        </p>
      </div>

      <TemplateList />
    </div>
  )
}
