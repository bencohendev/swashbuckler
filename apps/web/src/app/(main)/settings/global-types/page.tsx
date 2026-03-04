import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
import { GlobalTypesSection } from '@/features/global-types/components/GlobalTypesSection'

export default function GlobalTypesSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Settings
        </Link>
        <h1 className="text-2xl font-semibold">Global Types</h1>
        <p className="text-muted-foreground">
          Create reusable type blueprints you can import into any space.
        </p>
      </div>
      <GlobalTypesSection />
    </div>
  )
}
