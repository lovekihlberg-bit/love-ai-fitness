'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui/common'
import { useUser } from '@/lib/contexts/UserContext'
import { usePersonalRecords, useWorkoutHistory } from '@/lib/hooks/useSupabase'
import supabase from '@/lib/hooks/useSupabase'
import { TrendingUp, TrendingDown } from 'lucide-react'

function useLatest(table: string, valueCol: string, profileId: string) {
  const [value, setValue] = useState<number | null>(null)
  useEffect(() => {
    if (!profileId) return
    const tsCol = table === 'sleep_data' ? 'start_time' : 'timestamp'
    supabase.from(table).select(`${valueCol}, ${tsCol}`).eq('profile_id', profileId)
      .order(tsCol, { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setValue(data[0][valueCol]) })
  }, [table, valueCol, profileId])
  return value
}

export function RecoveryScore() {
  const { user } = useUser()
  const hrv = useLatest('hrv_data', 'hrv_ms', user?.id || '')
  const score = hrv ? Math.min(100, Math.round((hrv / 80) * 100)) : null

  return (
    <Card>
      <CardTitle>HRV</CardTitle>
      <CardContent>
        {score ? (
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-green-600">{Math.round(hrv!)} ms</div>
            <Badge variant="success">Bra</Badge>
          </div>
        ) : (
          <p className="text-gray-500">Ingen data tillgänglig</p>
        )}
      </CardContent>
    </Card>
  )
}

export function HealthMetricsGrid() {
  const { user } = useUser()
  const pid = user?.id || ''
  const hrv = useLatest('hrv_data', 'hrv_ms', pid)
  const hr = useLatest('heart_rate_data', 'heart_rate', pid)
  const vo2 = useLatest('vo2max_data', 'vo2_value', pid)
  const bw = useLatest('bodyweight_data', 'weight_kg', pid)

  const metrics = [
    { label: 'HRV', value: hrv ? `${Math.round(hrv)}` : '--', unit: 'ms' },
    { label: 'Vilopuls', value: hr ? `${Math.round(hr)}` : '--', unit: 'bpm' },
    { label: 'VO2 Max', value: vo2 ? `${vo2.toFixed(1)}` : '--', unit: 'ml/kg/min' },
    { label: 'Kroppsvikt', value: bw ? `${bw.toFixed(1)}` : '--', unit: 'kg' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {metrics.map(({ label, value, unit }) => (
        <Card key={label}>
          <CardDescription>{label}</CardDescription>
          <CardContent>
            <div className="text-2xl font-bold">
              {value}
              <span className="ml-1 text-sm text-gray-500">{unit}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function TrainingStreak() {
  const { user } = useUser()
  const { workouts } = useWorkoutHistory(user?.id || '', 100)

  const calculateStreak = () => {
    if (!workouts.length) return 0

    const dates = new Set(
      workouts.map((w) => new Date(w.session_date).toDateString())
    )

    let streak = 0
    let current = new Date()

    while (dates.has(current.toDateString())) {
      streak++
      current.setDate(current.getDate() - 1)
    }

    return streak
  }

  const streak = calculateStreak()
  const weeklyVolume = workouts
    .filter((w) => new Date(w.session_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .length

  return (
    <Card>
      <CardTitle>Träningsstreak</CardTitle>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Dagens streck:</span>
            <span className="text-2xl font-bold text-blue-600">{streak}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Veckoans pass:</span>
            <span className="text-2xl font-bold text-green-600">{weeklyVolume}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LatestPR() {
  const { user } = useUser()
  const { records } = usePersonalRecords(user?.id || '')

  const latest = records[0]

  return (
    <Card>
      <CardTitle>Senaste PR</CardTitle>
      <CardContent>
        {latest ? (
          <div className="space-y-2">
            <div className="text-lg font-semibold">{latest.exercises?.name_en}</div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-green-600" size={20} />
              <span className="text-xl font-bold">
                {latest.value} {latest.unit}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(latest.achieved_at).toLocaleDateString('sv-SE')}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Inga personliga rekord ännu</p>
        )}
      </CardContent>
    </Card>
  )
}

export function QuickActions() {
  return (
    <div className="flex gap-3">
      <a href="/training" className="flex-1 rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 transition-colors">
        + Logga träning
      </a>
      <a href="/health-data" className="flex-1 rounded-xl border border-white/10 bg-zinc-800 py-3 text-center text-sm font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors">
        ↑ Ladda hälsodata
      </a>
    </div>
  )
}
