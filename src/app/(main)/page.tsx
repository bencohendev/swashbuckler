import { createClient } from "@/shared/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground">
          {user?.email}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-6">
          <h2 className="mb-4 font-medium">Favorites</h2>
          <p className="text-sm text-muted-foreground">
            Your favorite objects will appear here.
          </p>
        </section>

        <section className="rounded-lg border p-6">
          <h2 className="mb-4 font-medium">Recent</h2>
          <p className="text-sm text-muted-foreground">
            Recently viewed objects will appear here.
          </p>
        </section>
      </div>
    </div>
  )
}
