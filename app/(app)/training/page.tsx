'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { WorkoutSession } from '@/components/training/WorkoutLogger'
import { useUser } from '@/lib/contexts/UserContext'
import supabase from '@/lib/hooks/useSupabase'
import { Plus, History, ChevronDown, ChevronUp, Trash2, Clock, Dumbbell } from 'lucide-react'

// ─── Workout History ───────────────────────────────────────────────────────────
function WorkoutHistory({ profileId }: { profileId: string }) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchSessions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('workout_sessions')
      .select(`
        id, session_date, duration_seconds, notes,
        workout_exercises(
          id, order_index,
          exercises(name_en, primary_muscles),
          exercise_sets(id, weight, reps, rpe)
        )
      `)
      .eq('profile_id', profileId)
      .order('session_date', { ascending: false })
      .limit(30)
    setSessions(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchSessions() }, [profileId])

  const deleteSession = async (id: string) => {
    if (!confirm('Radera detta träningspass?')) return
    setDeleting(id)
    await supabase.from('workout_sessions').delete().eq('id', id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setDeleting(null)
  }

  const fmt = (s: number) => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '--'

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (loading) return <div className="py-8 text-center text-sm text-zinc-500">Laddar historik...</div>
  if (!sessions.length) return (
    <div className="rounded-xl border border-dashed border-zinc-700 py-10 text-center text-sm text-zinc-500">
      Inga träningspass loggade än
    </div>
  )

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const exercises = session.workout_exercises || []
        const totalSets = exercises.reduce((a: number, we: any) => a + (we.exercise_sets?.length || 0), 0)
        const isOpen = expanded === session.id

        return (
          <div key={session.id} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {/* Session header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
              onClick={() => setExpanded(isOpen ? null : session.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-100 capitalize">{formatDate(session.session_date)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {exercises.length} övningar · {totalSets} set
                  {session.duration_seconds ? ` · ${fmt(session.duration_seconds)}` : ''}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                disabled={deleting === session.id}
                className="rounded-lg p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 size={15} />
              </button>
              {isOpen ? <ChevronUp size={16} className="text-zinc-500 shrink-0" /> : <ChevronDown size={16} className="text-zinc-500 shrink-0" />}
            </div>

            {/* Expanded exercises */}
            {isOpen && (
              <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                {exercises.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-zinc-500">Inga övningar loggade</p>
                ) : (
                  exercises
                    .sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((we: any) => (
                      <div key={we.id} className="px-4 py-3">
                        <p className="text-sm font-medium text-zinc-200">{we.exercises?.name_en}</p>
                        <p className="text-xs text-zinc-500 mb-2">{we.exercises?.primary_muscles?.slice(0, 2).join(', ')}</p>
                        {we.exercise_sets?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {we.exercise_sets.map((s: any, i: number) => (
                              <span key={s.id} className="rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                                {i + 1}. {s.weight}kg × {s.reps}{s.rpe ? ` @${s.rpe}` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                )}
                {session.notes && (
                  <div className="px-4 py-2 text-xs text-zinc-500 italic">{session.notes}</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const { user } = useUser()
  const profileId = user?.id || null
  const [tab, setTab] = useState<'log' | 'history'>('log')

  return (
    <Layout>
      <div className="space-y-4 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-zinc-100">Träning</h1>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-zinc-900 p-1">
          <button
            onClick={() => setTab('log')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'log' ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plus size={15} /> Logga pass
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'history' ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History size={15} /> Historik
          </button>
        </div>

        {!profileId ? (
          <div className="py-12 text-center text-zinc-500">Laddar profil...</div>
        ) : tab === 'log' ? (
          <WorkoutSession profileId={profileId} />
        ) : (
          <WorkoutHistory profileId={profileId} />
        )}
      </div>
    </Layout>
  )
}
