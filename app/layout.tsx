import type { Metadata } from 'next'
import { DM_Serif_Display, Outfit, JetBrains_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from './providers'
import './globals.css'

const displayFont = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  style: ['normal', 'italic'],
})

const outfitFont = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Content Hub',
  description: 'Dashboard per la creazione e gestione di articoli SEO',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${displayFont.variable} ${outfitFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          {children}
          <Toaster
            toastOptions={{
              style: {
                background: '#18181c',
                border: '1px solid #232328',
                color: '#f0ece4',
              },
            }}
            position="bottom-right"
          />
        </Providers>
      </body>
    </html>
  )
}
