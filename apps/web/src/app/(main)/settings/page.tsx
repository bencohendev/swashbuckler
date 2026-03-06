import Link from 'next/link'
import { BlocksIcon, FileStackIcon, FolderIcon, PaletteIcon, SwatchBookIcon, UserIcon, UsersIcon, LayersIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SpaceSettingsHeading } from './SpaceSettingsHeading'

interface SettingsItem {
  href: string
  label: string
  description: string
  icon: LucideIcon
  tourId: string
}

const accountItems: SettingsItem[] = [
  {
    href: '/settings/account',
    label: 'Account',
    description: 'Profile, security, and preferences',
    icon: UserIcon,
    tourId: 'settings-card-account',
  },
  {
    href: '/settings/spaces',
    label: 'Spaces',
    description: 'Manage your spaces',
    icon: FolderIcon,
    tourId: 'settings-card-spaces',
  },
  {
    href: '/settings/global-types',
    label: 'Global Types',
    description: 'Reusable type blueprints for any space',
    icon: BlocksIcon,
    tourId: 'settings-card-global-types',
  },
  {
    href: '/settings/themes',
    label: 'Custom Themes',
    description: 'Create and manage custom themes',
    icon: SwatchBookIcon,
    tourId: 'settings-card-themes',
  },
]

const spaceItems: SettingsItem[] = [
  {
    href: '/settings/appearance',
    label: 'Appearance',
    description: 'Choose a theme for this space',
    icon: PaletteIcon,
    tourId: 'settings-card-appearance',
  },
  {
    href: '/settings/templates',
    label: 'Templates',
    description: 'Manage your templates',
    icon: FileStackIcon,
    tourId: 'settings-card-templates',
  },
  {
    href: '/settings/types',
    label: 'Types',
    description: 'Customize types and their properties',
    icon: LayersIcon,
    tourId: 'settings-card-types',
  },
  {
    href: '/settings/sharing',
    label: 'Sharing',
    description: 'Manage space sharing and permissions',
    icon: UsersIcon,
    tourId: 'settings-card-sharing',
  },
]

function SettingsCard({ href, label, description, icon: Icon, tourId }: SettingsItem) {
  return (
    <Link
      href={href}
      data-tour={tourId}
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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and space settings.
        </p>
      </div>

      <section aria-labelledby="settings-account-heading" data-tour="settings-account">
        <h2 id="settings-account-heading" className="mb-4 text-lg font-medium">Account</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {accountItems.map(item => (
            <SettingsCard key={item.href} {...item} />
          ))}
        </div>
      </section>

      <section aria-labelledby="settings-space-heading" data-tour="settings-space">
        <SpaceSettingsHeading />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {spaceItems.map(item => (
            <SettingsCard key={item.href} {...item} />
          ))}
        </div>
      </section>
    </div>
  )
}
