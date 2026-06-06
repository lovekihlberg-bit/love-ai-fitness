import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'LOVE AI FITNESS',
  description: 'AI-driven träningsplattform för prestationsoptimering',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LOVE AI',
  },
  themeColor: '#09090b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
