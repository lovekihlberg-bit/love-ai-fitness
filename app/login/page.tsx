'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/hooks/useSupabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); return }
      router.push('/dashboard')
    } catch {
      setError('Ett fel uppstod vid inloggning')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 shadow-2xl shadow-blue-500/30">
            <span className="text-lg font-black text-white">LA</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">
            LOVE <span className="text-blue-400">AI</span>
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-500">Fitness</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-6 shadow-2xl">
          <h2 className="mb-5 text-base font-semibold text-zinc-100">Logga in</h2>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.com"
                required
                className="w-full rounded-xl border border-white/8 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-white/8 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-400 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Inget konto?{' '}
          <a href="/signup" className="font-semibold text-blue-400 hover:text-blue-300">
            Skapa ett
          </a>
        </p>
      </div>
    </div>
  )
}
