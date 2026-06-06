'use client'

import { ThemeProvider } from 'next-themes'
import { UserProvider } from '@/lib/contexts/UserContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
      <UserProvider>
        {children}
      </UserProvider>
    </ThemeProvider>
  )
}
