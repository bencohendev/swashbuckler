import { type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/landing"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to home
        </Link>
        {children}
      </div>
    </div>
  )
}
