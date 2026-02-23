import { Suspense, type ReactNode } from 'react'

function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  )
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<SettingsLoading />}>
      {children}
    </Suspense>
  )
}
