import Link from 'next/link'
import { FileStackIcon, UsersIcon, LayersIcon } from 'lucide-react'

const settingsItems = [
  {
    href: '/settings/templates',
    label: 'Templates',
    description: 'Manage your object templates',
    icon: FileStackIcon,
  },
  {
    href: '/settings/types',
    label: 'Object Types',
    description: 'Customize object types and properties',
    icon: LayersIcon,
  },
  {
    href: '/settings/sharing',
    label: 'Sharing',
    description: 'Manage workspace sharing and permissions',
    icon: UsersIcon,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace settings and preferences.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="rounded-md bg-muted p-2">
              <item.icon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-medium">{item.label}</h2>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
