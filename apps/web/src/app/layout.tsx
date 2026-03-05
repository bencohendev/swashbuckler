import type { Metadata } from "next"
import { Geist, Geist_Mono, Cinzel, Lora, Orbitron, Share_Tech_Mono } from "next/font/google"
import { Providers } from "./providers"
import { getThemeScript } from "@/features/theme-builder"
import { getUser } from "@/shared/lib/supabase/server"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const cinzel = Cinzel({
  variable: "--font-fantasy-heading",
  subsets: ["latin"],
})

const lora = Lora({
  variable: "--font-fantasy-body",
  subsets: ["latin"],
})

const orbitron = Orbitron({
  variable: "--font-scifi-heading",
  subsets: ["latin"],
})

const shareTechMono = Share_Tech_Mono({
  variable: "--font-scifi-body",
  weight: "400",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Swashbuckler — The knowledge base built for tabletops",
    template: "%s | Swashbuckler",
  },
  description:
    "Organize your TTRPG campaign with custom types, a rich block editor, knowledge graph, real-time collaboration, and granular sharing. No AI — just your words.",
  keywords: [
    "TTRPG",
    "tabletop RPG",
    "campaign manager",
    "knowledge base",
    "worldbuilding",
    "D&D",
    "DnD",
    "game master",
    "dungeon master",
    "session notes",
    "campaign notes",
    "wiki",
  ],
  metadataBase: new URL("https://swashbuckler.quest"),
  openGraph: {
    type: "website",
    siteName: "Swashbuckler",
    title: "Swashbuckler — The knowledge base built for tabletops",
    description:
      "Organize your TTRPG campaign with custom types, a rich block editor, knowledge graph, real-time collaboration, and granular sharing.",
    url: "https://swashbuckler.quest",
  },
  twitter: {
    card: "summary",
    title: "Swashbuckler — The knowledge base built for tabletops",
    description:
      "Organize your TTRPG campaign with custom types, a rich block editor, knowledge graph, real-time collaboration, and granular sharing.",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialUser = await getUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${lora.variable} ${orbitron.variable} ${shareTechMono.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
        <Providers initialUser={initialUser}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
