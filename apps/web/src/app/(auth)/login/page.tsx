import { Suspense } from "react"
import { LoginForm } from "@/features/auth/components"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
