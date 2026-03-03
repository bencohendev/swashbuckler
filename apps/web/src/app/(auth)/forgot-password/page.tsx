import { Suspense } from "react"
import { ForgotPasswordForm } from "@/features/auth/components"

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
