import type { Metadata } from "next"
import { Geist, Geist_Mono, Cinzel, Lora } from "next/font/google"
import { Providers } from "./providers"
import { getThemeScript } from "@/features/theme-builder"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"


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

export const metadata: Metadata = {
  title: "Swashbuckler",
  description: "Your personal knowledge base",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${lora.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
        <Providers>
          {children}
          <Analytics/>
          <SpeedInsights/>
        </Providers>
      </body>
    </html>
  )
}
