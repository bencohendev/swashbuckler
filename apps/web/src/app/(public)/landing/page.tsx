import Link from "next/link"
import { PenLineIcon, BoxesIcon, NetworkIcon, UsersIcon } from "lucide-react"
import { GuestButton } from "./GuestButton"
import { PixelPirateFlag } from "./PixelPirateFlag"

const features = [
  {
    icon: PenLineIcon,
    title: "Block Editor",
    description:
      "Rich text with slash commands, mentions, tables, and code blocks.",
  },
  {
    icon: BoxesIcon,
    title: "Custom Types",
    description:
      "Define your own entry types with custom fields and templates.",
  },
  {
    icon: NetworkIcon,
    title: "Knowledge Graph",
    description: "Visualize connections between your entries.",
  },
  {
    icon: UsersIcon,
    title: "Real-time Collaboration",
    description: "Share spaces and edit together in real time.",
  },
]

export default function LandingPage() {
  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-lg font-bold tracking-tight">Swashbuckler</span>
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign In
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <PixelPirateFlag />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Your personal knowledge base
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Organize ideas with a block editor, custom types, and a visual
            graph.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <GuestButton />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-6 text-card-foreground"
              >
                <feature.icon className="size-8 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        &copy; Swashbuckler &middot;{" "}
        <Link href="/docs" className="underline hover:text-foreground transition-colors">
          Docs
        </Link>
      </footer>
    </>
  )
}
