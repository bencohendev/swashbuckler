'use client'

import Link from 'next/link'
import { ArrowLeftIcon, UserIcon } from 'lucide-react'
import { useAuth } from '@/shared/lib/data'
import { ProfileSection } from './ProfileSection'
import { PasswordSection } from './PasswordSection'
import { ConnectedAccountsSection } from './ConnectedAccountsSection'
import { PreferencesSection } from './PreferencesSection'
import { CustomThemesSection } from './CustomThemesSection'
import { GlobalTypesSection } from '@/features/global-types/components/GlobalTypesSection'
import { DataExportSection } from './DataExportSection'
import { DeleteAccountSection } from './DeleteAccountSection'

export function AccountSettings() {
  const { user, isGuest } = useAuth()

  if (isGuest || !user) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-lg border p-6 text-center">
          <UserIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Account settings are not available in guest mode. Sign in to manage your account.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header />
      <ProfileSection user={user} />
      <PasswordSection user={user} />
      <ConnectedAccountsSection user={user} />
      <PreferencesSection user={user} />
      <CustomThemesSection />
      <GlobalTypesSection />
      <DataExportSection />
      <DeleteAccountSection user={user} />
    </div>
  )
}

function Header() {
  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Settings
      </Link>
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="text-muted-foreground">
        Manage your profile, security, and preferences.
      </p>
    </div>
  )
}
