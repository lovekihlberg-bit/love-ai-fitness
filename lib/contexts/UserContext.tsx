'use client'

import React from 'react'
import { createContext, useContext, useState } from 'react'

interface User {
  id: string
  full_name: string
  preferred_name?: string
  height_cm?: number
  timezone?: string
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
  setLoading: (loading: boolean) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  return (
    <UserContext.Provider value={{ user, setUser, loading, setLoading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
