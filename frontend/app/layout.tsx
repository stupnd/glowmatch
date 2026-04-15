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
        {children}
      </body>
    </html>
  )
}
