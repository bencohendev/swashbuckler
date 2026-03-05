"use client"

import { useRouter } from "next/navigation"

export function GuestButton() {
  const router = useRouter()

  const handleClick = () => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `swashbuckler-guest=1; path=/; max-age=31536000; SameSite=Lax${secure}`
    router.push("/dashboard")
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex h-14 w-full items-center justify-center rounded-md border bg-background px-10 text-lg font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors sm:w-auto"
    >
      Try as Guest
    </button>
  )
}
