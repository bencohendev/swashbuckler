"use client"

import { useState } from "react"
import { GuestModeDialog } from "@/features/onboarding/components/GuestModeDialog"

export function GuestButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="underline underline-offset-4 hover:text-foreground transition-colors"
      >
        try as guest
      </button>
      <GuestModeDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
