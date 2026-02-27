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
        <section className="relative z-10 mx-auto max-w-3xl px-6 py-24">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-12">
            <div className="shrink-0">
              <PixelPirateFlag />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-lg text-muted-foreground">
                Avast ye matey, welcome to
              </p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
                Swashbuckler
              </h1>
              <p className="mt-3 text-base text-muted-foreground/80">
                Your personal knowledge base
              </p>
              <div className="mt-8 flex items-center justify-center gap-4 sm:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </Link>
                <GuestButton />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
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

      <footer className="relative z-10 bg-[#D2B48C] pt-8 pb-4">
        <div className="max-w-3xl overflow-hidden px-6" aria-hidden="true">
          <PixelBeachScene />
        </div>
        <p className="mt-4 px-6 text-center text-sm text-[#5D3A1A]">
          &copy; Swashbuckler &middot;{" "}
          <Link href="/docs" className="underline hover:text-[#3A2210] transition-colors">
            Docs
          </Link>
        </p>
      </footer>
    </div>
  )
}
