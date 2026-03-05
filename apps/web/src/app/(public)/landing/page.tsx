import Link from "next/link"
import { PenLineIcon, BoxesIcon, NetworkIcon, UsersIcon, ShieldIcon, EyeOffIcon } from "lucide-react"
import { GuestButton } from "./GuestButton"
import { PixelBeachScene } from "./PixelBeachScene"
import { PixelPirateFlag } from "./PixelPirateFlag"

const features = [
  {
    icon: PenLineIcon,
    title: "Rich Block Editor",
    description:
      "Write session notes, lore entries, and NPC backstories with slash commands, mentions, tables, and more.",
    href: "https://docs.swashbuckler.quest/docs/editor",
  },
  {
    icon: BoxesIcon,
    title: "Custom Types",
    description:
      "Organize NPCs, Locations, Factions, Items — or define your own entry types with custom fields and templates.",
    href: "https://docs.swashbuckler.quest/docs/entries-and-types",
  },
  {
    icon: NetworkIcon,
    title: "Knowledge Graph",
    description:
      "See how your world connects — visualize relationships between characters, places, and plot threads.",
    href: "https://docs.swashbuckler.quest/docs/graph-view",
  },
  {
    icon: UsersIcon,
    title: "Real-time Collaboration",
    description: "Co-author with your party in real time. Share a space and build your world together.",
    href: "https://docs.swashbuckler.quest/docs/realtime-collaboration",
  },
  {
    icon: ShieldIcon,
    title: "Advanced Sharing",
    description:
      "Fine-tune exactly which types and entries are shared with your party. Keep your secrets safe.",
  },
  {
    icon: EyeOffIcon,
    title: "Private Blocks",
    description:
      "Add hidden notes to shared entries that only you can see — perfect for GM-only details.",
  },
]

export default function LandingPage() {
  return (
    <div className="dark relative flex min-h-screen flex-col bg-background text-foreground">
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
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Swashbuckler
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              The knowledge base built for game masters.
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70">
              Your campaign. Organized.
            </p>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-2xl border-y border-border px-6 py-8">
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex h-14 w-full items-center justify-center rounded-md bg-primary px-10 text-lg font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors sm:w-auto"
            >
              Get Started
            </Link>
            <p className="text-sm text-muted-foreground">
              or{" "}
              <GuestButton />
            </p>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-2xl px-6 py-12">
          <h2 className="mb-8 text-center text-xl font-semibold">
            Everything you need to run your world
          </h2>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            {features.map((feature) => {
              const content = (
                <>
                  <feature.icon className="size-8 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </>
              )

              if (feature.href) {
                return (
                  <a
                    key={feature.title}
                    href={feature.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border bg-card p-6 text-card-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    {content}
                  </a>
                )
              }

              return (
                <div
                  key={feature.title}
                  className="rounded-lg border bg-card p-6 text-card-foreground"
                >
                  {content}
                </div>
              )
            })}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-2xl px-6 pb-12 text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            No AI. No autocomplete. Just your words.
          </p>
          <p className="text-sm text-muted-foreground/70">
            Not a GM? Swashbuckler works great as a general-purpose wiki for worldbuilding, research, or any project.
          </p>
        </section>

        <section className="relative z-10 mx-auto max-w-2xl px-6 pb-24 text-center">
          <div className="flex flex-col items-center gap-3">
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
          </a>{" "}
          &middot;{" "}
          <Link href="/privacy" className="underline hover:text-white transition-colors">
            Privacy
          </Link>{" "}
          &middot;{" "}
          <Link href="/terms" className="underline hover:text-white transition-colors">
            Terms
          </Link>
        </p>
      </footer>
    </div>
  )
}
