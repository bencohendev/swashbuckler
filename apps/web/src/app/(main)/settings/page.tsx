'use client'

import Link from 'next/link'
import { FileStackIcon, FolderIcon, PaletteIcon, UserIcon, UsersIcon, LayersIcon } from 'lucide-react'
import { useCurrentSpace } from '@/shared/lib/data'
import type { LucideIcon } from 'lucide-react'

interface SettingsItem {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

const accountItems: SettingsItem[] = [
  {
    href: '/settings/account',
    label: 'Account',
    description: 'Profile, security, and preferences',
    icon: UserIcon,
  },
  {
    href: '/settings/spaces',
    label: 'Spaces',
    description: 'Manage your spaces',
    icon: FolderIcon,
  },
]

const spaceItems: SettingsItem[] = [
  {
    href: '/settings/appearance',
    label: 'Appearance',
    description: 'Customize themes and color schemes',
    icon: PaletteIcon,
  },
  {
    href: '/settings/templates',
    label: 'Templates',
    description: 'Manage your templates',
    icon: FileStackIcon,
  },
  {
    href: '/settings/types',
    label: 'Types',
    description: 'Customize types and their properties',
    icon: LayersIcon,
  },
  {
    href: '/settings/sharing',
    label: 'Sharing',
    description: 'Manage space sharing and permissions',
    icon: UsersIcon,
  },
]

function SettingsCard({ href, label, description, icon: Icon }: SettingsItem) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="rounded-md bg-muted p-2">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-medium">{label}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

export default function SettingsPage() {
  const { space } = useCurrentSpace()

  const spaceHeading = space ? `${space.icon ?? ''} ${space.name}`.trim() : 'Space'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and space settings.
        </p>
      </div>

      <section aria-labelledby="settings-account-heading">
        <h2 id="settings-account-heading" className="mb-4 text-lg font-medium">Account</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accountItems.map(item => (
            <SettingsCard key={item.href} {...item} />
          ))}
        </div>
      </section>

      <section aria-labelledby="settings-space-heading">
        <h2 id="settings-space-heading" className="mb-4 text-lg font-medium">{spaceHeading}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaceItems.map(item => (
            <SettingsCard key={item.href} {...item} />
          ))}
        </div>
      </section>
    </div>
  )
}
