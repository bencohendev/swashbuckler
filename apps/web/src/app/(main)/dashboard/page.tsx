import { getUser } from "@/shared/lib/supabase/server"
import { DashboardContent } from "./DashboardContent"

function isFirstLogin(user: { created_at: string; last_sign_in_at?: string | null }): boolean {
  if (!user.last_sign_in_at) return true
  const created = new Date(user.created_at).getTime()
  const lastSignIn = new Date(user.last_sign_in_at).getTime()
  return Math.abs(lastSignIn - created) < 60_000
}

export default async function DashboardPage() {
  const user = await getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {user ? (isFirstLogin(user) ? "Welcome" : "Welcome back") : "Welcome"}
        </h1>
        <p className="text-muted-foreground">
          {user?.email ?? "You're using Swashbuckler as a guest. Sign up to save your work."}
        </p>
      </div>

      <DashboardContent />
    </div>
  )
}
