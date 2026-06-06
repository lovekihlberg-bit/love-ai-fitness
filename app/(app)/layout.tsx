'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/contexts/UserContext'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { setUser, setLoading } = useUser()
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Fetch user profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error || !profile) {
        router.push('/login')
        return
      }

      setUser(profile)
      setIsAuthChecked(true)
      setLoading(false)
    }

    checkAuth()
  }, [setUser, setLoading, router])

  if (!isAuthChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400" />
          <p className="text-gray-600 dark:text-gray-400">Laddar...</p>
        </div>
      </div>
    )
  }

  return children
}
