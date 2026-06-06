'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/hooks/useSupabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (signUpError) { setError(signUpError.message); return }
      if (!authData.user) { setError('Kunde inte skapa konto'); return }
      router.push('/dashboard')
    } catch {
      setError('Ett fel uppstod vid registrering')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 shadow-2xl shadow-blue-500/30">
            <span className="text-lg font-black text-white">LA</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">
            LOVE <span className="text-blue-400">AI</span>
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-500">Fitness</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-6 shadow-2xl">
          <h2 className="mb-5 text-base font-semibold text-zinc-100">Skapa konto</h2>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {[
              { label: 'Fullständigt namn', type: 'text', value: fullName, onChange: setFullName, placeholder: 'Love Kihlberg' },
              { label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'din@email.com' },
              { label: 'Lösenord', type: 'password', value: password, onChange: setPassword, placeholder: '••••••••' },
            ].map(({ label, type, value, onChange, placeholder }) => (
              <div key={label} className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  required
                  className="w-full rounded-xl border border-white/8 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-400 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Skapar konto...' : 'Skapa konto'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Har du ett konto?{' '}
          <a href="/login" className="font-semibold text-blue-400 hover:text-blue-300">
            Logga in
          </a>
        </p>
      </div>
    </div>
  )
}
