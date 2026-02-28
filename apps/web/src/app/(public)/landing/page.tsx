import Link from "next/link"
import { PenLineIcon, BoxesIcon, NetworkIcon, UsersIcon } from "lucide-react"
import { GuestButton } from "./GuestButton"
import { PixelBeachScene } from "./PixelBeachScene"
import { PixelPirateFlag } from "./PixelPirateFlag"

const features = [
  {
    icon: PenLineIcon,
    title: "Block Editor",
    description:
      "Rich text with slash commands, mentions, tables, and code blocks.",
    href: "https://docs.swashbuckler.quest/docs/editor",
  },
  {
    icon: BoxesIcon,
    title: "Custom Types",
    description:
      "Define your own entry types with custom fields and templates.",
    href: "https://docs.swashbuckler.quest/docs/entries-and-types",
  },
  {
    icon: NetworkIcon,
    title: "Knowledge Graph",
    description: "Visualize connections between your entries.",
    href: "https://docs.swashbuckler.quest/docs/graph-view",
  },
  {
    icon: UsersIcon,
    title: "Real-time Collaboration",
    description: "Share spaces and edit together in real time.",
    href: "https://docs.swashbuckler.quest/docs/realtime-collaboration",
  },
]

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Flagpole running full page height — aligned to left edge of max-w-3xl content */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[7rem] bottom-0 mx-auto hidden max-w-3xl px-6 sm:block"
        aria-hidden="true"
      >
        <div className="h-full w-[16px] bg-[#8B5E3C]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b bg-background">
        <span className="text-lg font-bold tracking-tight">Swashbuckler</span>
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign In
        </Link>
      </header>

      <main className="flex-1">
        <section className="relative z-10 mx-auto max-w-3xl px-6 pt-24 pb-4">
          <PixelPirateFlag />
        </section>

        <section className="relative z-10 mx-auto max-w-3xl px-6 pt-8 pb-6">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">
              Avast ye matey, welcome to
            </p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
              Swashbuckler
            </h1>
            <p className="mt-3 text-base text-muted-foreground/80">
              Your personal knowledge base
            </p>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-2xl px-6 py-8">
          <hr className="mb-8 border-border" />
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <div className="flex w-full flex-col items-center gap-1 sm:w-auto">
              <p className="text-sm text-muted-foreground">Create an account and</p>
              <Link
                href="/signup"
                className="inline-flex h-14 w-full items-center justify-center rounded-md bg-primary px-10 text-lg font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors sm:w-auto"
              >
                Get Started
              </Link>
            </div>
            <div className="flex w-full flex-col items-center gap-1 sm:w-auto">
              <p className="text-sm text-muted-foreground">or</p>
              <GuestButton />
            </div>
          </div>
          <hr className="mt-8 border-border" />
        </section>

        <section className="relative z-10 mx-auto max-w-2xl px-6 pb-12">
          <p className="mb-6 text-center text-muted-foreground">
            Swashbuckler is a fully featured note-taking app. Take advantage of:
          </p>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            {features.map((feature) => (
              <a
                key={feature.title}
                href={feature.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border bg-card p-6 text-card-foreground transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <feature.icon className="size-8 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </a>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-2xl px-6 pb-24 text-center">
          <p className="text-muted-foreground">...and much more</p>
          <div className="mt-4 flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="https://docs.swashbuckler.quest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-md border bg-background px-6 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Read the Docs
            </a>
          </div>
        </section>

      </main>

      <footer className="relative z-10 bg-[#0C2D48] pb-4">
        <div className="mx-auto max-w-3xl overflow-hidden pl-2 pr-6" aria-hidden="true">
          <PixelBeachScene />
        </div>
        <p className="mt-4 px-6 text-center text-sm text-[#7EC4DE]">
          &copy; Swashbuckler &middot;{" "}
          <a href="https://docs.swashbuckler.quest" className="underline hover:text-white transition-colors">
            Docs
          </a>
        </p>
      </footer>
    </div>
  )
}
