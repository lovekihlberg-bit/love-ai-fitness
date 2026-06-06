'use client'

import React from 'react'

// ─── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-white/5 bg-zinc-900 p-5 ${onClick ? 'cursor-pointer transition-all hover:border-white/10 hover:bg-zinc-800/80' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-xs font-semibold uppercase tracking-widest text-zinc-400 ${className}`}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mt-3 ${className}`}>{children}</div>
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-xs text-zinc-500 ${className}`}>{children}</p>
}

// ─── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
  const variants = {
    primary:   'rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400',
    secondary: 'rounded-xl border border-white/10 bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
    ghost:     'rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
    danger:    'rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3.5 text-base' }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</label>}
      <input
        className={`w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition-all focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'success' | 'error' | 'warning' | 'info'; className?: string }

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300 border-white/5',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    error:   'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info:    'bg-sky-500/10 text-sky-400 border-sky-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-zinc-800/60 p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${active === tab ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
