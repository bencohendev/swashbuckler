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
      className="underline underline-offset-4 hover:text-foreground transition-colors"
    >
      try as guest
    </button>
  )
}
