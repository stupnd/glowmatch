import type { Metadata } from "next"
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import AuthButton from "@/components/AuthButton"

const dmSerif = DM_Serif_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
})

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Tinted — Your Perfect Shade",
  description: "AI-powered foundation shade matching for every skin tone",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${jakarta.variable}`}>
      <body className="min-h-screen">
        {/* Fixed auth button — top-right, above everything */}
        <div className="fixed top-4 right-4 z-50">
          <AuthButton />
        </div>
        {/* Centered lip combo nav link */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <a
            href="/lip-combo"
            className="tag-pill"
            style={{
              color: "var(--lilac)", borderColor: "var(--lilac)",
              background: "rgba(255,255,255,0.88)",
              fontSize: 13, fontWeight: 500, textDecoration: "none",
            }}
          >
            lip combo ✦
          </a>
        </div>
        {children}
      </body>
    </html>
  )
}
