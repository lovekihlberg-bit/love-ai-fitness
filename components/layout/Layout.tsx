'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, Dumbbell, Search, BarChart2,
  MessageSquare, Camera, Settings, Sun, Moon
} from 'lucide-react'
// ─── Logo ─────────────────────────────────────────────────────────────────────
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'sm' ? 36 : size === 'lg' ? 100 : 64
  return (
    <img
      src="/logo.png"
      alt="LOVE AI FITNESS"
      height={h}
      style={{ height: h, width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  )
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  { href: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/training',        icon: Dumbbell,        label: 'Träning'   },
  { href: '/exercises',       icon: Search,          label: 'Övningar'  },
  { href: '/analytics',       icon: BarChart2,       label: 'Statistik' },
  { href: '/ai-coach',        icon: MessageSquare,   label: 'AI Coach'  },
  { href: '/progress-photos', icon: Camera,          label: 'Progress'  },
  { href: '/settings',        icon: Settings,        label: 'Inställningar' },
]

// ─── Side Nav ─────────────────────────────────────────────────────────────────
export function SideNav() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/5 bg-zinc-950 px-3 py-6 sm:flex">
      <div className="mb-8 px-2">
        <Logo />
      </div>

      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 px-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-ghost w-full justify-start text-xs text-zinc-500"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {theme === 'dark' ? 'Ljust läge' : 'Mörkt läge'}
        </button>
      </div>
    </aside>
  )
}

// ─── Mobile Header ────────────────────────────────────────────────────────────
export function Header() {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-zinc-950/90 px-4 backdrop-blur-xl sm:hidden"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: '12px' }}
    >
      <Logo size="sm" />
    </header>
  )
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
export function BottomNav() {
  const pathname = usePathname()
  const mobileNav = NAV.slice(0, 6)

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex border-t border-white/5 bg-zinc-950/95 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      {mobileNav.map(({ href, icon: Icon, label }) => {
        const active = pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 pt-2.5 text-[10px] font-medium transition-colors min-h-[48px] ${
              active ? 'text-blue-400' : 'text-zinc-500'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.5} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <SideNav />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto sm:pb-0" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
