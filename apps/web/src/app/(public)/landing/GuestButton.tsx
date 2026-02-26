"use client"

import { useRouter } from "next/navigation"

export function GuestButton() {
  const router = useRouter()

  const handleClick = () => {
    document.cookie = "swashbuckler-guest=1; path=/; max-age=31536000; SameSite=Lax; Secure"
    router.push("/dashboard")
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex h-10 items-center rounded-md border bg-background px-6 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      Try as Guest
    </button>
  )
}
