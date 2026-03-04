import { getUser } from "@/shared/lib/supabase/server"
import { DashboardContent } from "./DashboardContent"

export default async function DashboardPage() {
  const user = await getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {user ? "Welcome back" : "Welcome"}
        </h1>
        <p className="text-muted-foreground">
          {user?.email ?? "You're using Swashbuckler as a guest. Sign up to save your work."}
        </p>
      </div>

      <DashboardContent />
    </div>
  )
}
