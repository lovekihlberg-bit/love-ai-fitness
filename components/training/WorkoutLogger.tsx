'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/common'
import { useUser } from '@/lib/contexts/UserContext'
import { Search, X, Plus, CheckCircle, Clock, Trash2, History, ChevronDown, ChevronUp } from 'lucide-react'
import supabase from '@/lib/hooks/useSupabase'

// ─── Muscle group tabs for "My Exercises" ──────────────────────────────────────
const MUSCLE_GROUPS = ['Alla', 'Chest', 'Back', 'Shoulders', 'Quadriceps', 'Hamstrings', 'Glutes', 'Biceps', 'Triceps', 'Core', 'Calves']

// ─── My Exercises Browser ──────────────────────────────────────────────────────
interface MyExercisesBrowserProps {
  profileId: string
  onSelect: (exercise: any) => void
}

function MyExercisesBrowser({ profileId, onSelect }: MyExercisesBrowserProps) {
  const [activeGroup, setActiveGroup] = useState('Alla')
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchPreviousExercises = async () => {
      setLoading(true)
      // Get exercises the user has previously logged
      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('profile_id', profileId)
        .limit(50)

      if (!sessionData?.length) {
        setExercises([])
        setLoading(false)
        return
      }

      const sessionIds = sessionData.map((s: any) => s.id)

      const { data: weData } = await supabase
        .from('workout_exercises')
        .select('exercise_id, exercises(id, name_en, primary_muscles, equipment, category, image_url)')
        .in('session_id', sessionIds)

      if (!weData) { setLoading(false); return }

      // Deduplicate by exercise id
      const seen = new Set<string>()
      const unique = weData
        .map((we: any) => we.exercises)
        .filter(Boolean)
        .filter((ex: any) => {
          if (seen.has(ex.id)) return false
          seen.add(ex.id)
          return true
        })

      setExercises(unique)
      setLoading(false)
    }

    fetchPreviousExercises()
  }, [profileId])

  const filtered = activeGroup === 'Alla'
    ? exercises
    : exercises.filter((ex: any) =>
        ex.primary_muscles?.some((m: string) => m.toLowerCase().includes(activeGroup.toLowerCase()))
        || ex.category?.toLowerCase().includes(activeGroup.toLowerCase())
      )

  if (loading) {
    return <div className="py-4 text-center text-sm text-gray-400">Laddar dina övningar...</div>
  }

  if (exercises.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400 dark:border-gray-600">
        <History size={24} className="mx-auto mb-2 opacity-40" />
        Inga tidigare övningar än — börja logga så sparas de här!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Muscle group tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {MUSCLE_GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeGroup === g
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      {filtered.length === 0 ? (
        <div className="py-4 text-center text-sm text-gray-400">Inga övningar i den här gruppen ännu</div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto">
          {filtered.map((ex: any) => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-blue-400 hover:bg-blue-50 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              {ex.image_url ? (
                <img src={ex.image_url} alt={ex.name_en} className="h-10 w-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                  <span className="text-lg">🏋️</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{ex.name_en}</p>
                <p className="truncate text-xs text-gray-400">
                  {ex.primary_muscles?.slice(0, 2).join(', ') || ex.category || ''}
                </p>
              </div>
              <Plus size={16} className="ml-auto shrink-0 text-blue-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Exercise Search ───────────────────────────────────────────────────────────
interface ExerciseSearchProps {
  onSelect: (exercise: any) => void
}

export function ExerciseSearch({ onSelect }: ExerciseSearchProps) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!term.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('exercises')
        .select('id, name_en, primary_muscles, equipment, difficulty, image_url')
        .or(`name_en.ilike.%${term}%`)
        .limit(20)
      setResults(data || [])
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [term])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Sök övning..."
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        {term && (
          <button onClick={() => { setTerm(''); setResults([]); setOpen(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <X size={14} />
          </button>
        )}
      </div>

      {open && term && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="p-3 text-center text-sm text-gray-400">Söker...</div>
          ) : results.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              {results.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => { onSelect(ex); setTerm(''); setResults([]); setOpen(false) }}
                  className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  {ex.image_url ? (
                    <img src={ex.image_url} alt={ex.name_en} className="h-8 w-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-700 text-base">🏋️</div>
                  )}
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{ex.name_en}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {ex.primary_muscles?.slice(0, 2).join(', ')}
                      {ex.equipment?.length > 0 && ` · ${ex.equipment[0]}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-gray-400">Ingen övning hittad</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Set Row ────────────────────────────────────────────────────────────────────
interface SetRowProps {
  setNumber: number
  workoutExerciseId: string
  onLogged: (set: any) => void
}

function SetRow({ setNumber, workoutExerciseId, onLogged }: SetRowProps) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!weight || !reps) return
    setSaving(true)
    const { data, error } = await supabase.from('exercise_sets').insert([{
      workout_exercise_id: workoutExerciseId,
      weight: parseFloat(weight),
      reps: parseInt(reps),
      rpe: rpe ? parseInt(rpe) : null,
    }]).select().single()
    setSaving(false)
    if (!error && data) {
      setSaved(true)
      onLogged(data)
    }
  }

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${saved ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
      <span className="w-5 text-xs font-bold text-gray-400">{setNumber}</span>
      <input
        type="number"
        placeholder="kg"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        disabled={saved}
        className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-center text-sm disabled:bg-transparent disabled:border-transparent dark:border-gray-600 dark:bg-gray-700"
      />
      <input
        type="number"
        placeholder="reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        disabled={saved}
        className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-center text-sm disabled:bg-transparent disabled:border-transparent dark:border-gray-600 dark:bg-gray-700"
      />
      <input
        type="number"
        placeholder="RPE"
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
        min="1" max="10"
        disabled={saved}
        className="w-14 rounded border border-gray-200 bg-white px-2 py-1 text-center text-sm disabled:bg-transparent disabled:border-transparent dark:border-gray-600 dark:bg-gray-700"
      />
      {saved ? (
        <CheckCircle size={18} className="shrink-0 text-green-500" />
      ) : (
        <button
          onClick={save}
          disabled={saving || !weight || !reps}
          className="rounded-lg bg-blue-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {saving ? '...' : 'Spara'}
        </button>
      )}
    </div>
  )
}

// ─── Exercise Block ────────────────────────────────────────────────────────────
interface ExerciseBlockProps {
  exercise: any
  workoutExerciseId: string
  onRemove: () => void
}

function ExerciseBlock({ exercise, workoutExerciseId, onRemove }: ExerciseBlockProps) {
  const [sets, setSets] = useState<any[]>([{}])
  const [loggedSets, setLoggedSets] = useState<any[]>([])

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {exercise.image_url ? (
            <img src={exercise.image_url} alt={exercise.name_en} className="h-9 w-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-lg">🏋️</div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name_en}</p>
            <p className="text-xs text-gray-500">{loggedSets.length} set loggade</p>
          </div>
        </div>
        <button onClick={onRemove} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <div className="flex gap-2 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
          <span className="w-5">#</span>
          <span className="w-16 text-center">Vikt</span>
          <span className="w-16 text-center">Reps</span>
          <span className="w-14 text-center">RPE</span>
        </div>
        {sets.map((_, i) => (
          <SetRow
            key={i}
            setNumber={i + 1}
            workoutExerciseId={workoutExerciseId}
            onLogged={(data) => setLoggedSets((prev) => [...prev, data])}
          />
        ))}
        <button
          onClick={() => setSets((prev) => [...prev, {}])}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-2 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:border-gray-600"
        >
          <Plus size={14} /> Lägg till set
        </button>
      </div>
    </div>
  )
}

// ─── Workout Session ───────────────────────────────────────────────────────────
interface WorkoutSessionProps {
  profileId: string
}

export function WorkoutSession({ profileId }: WorkoutSessionProps) {
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Array<{ exercise: any; workoutExerciseId: string }>>([])
  const [startTime] = useState(new Date())
  const [elapsed, setElapsed] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const [finished, setFinished] = useState(false)
  const [showMyExercises, setShowMyExercises] = useState(true)

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const ensureWorkout = async (): Promise<string | null> => {
    if (workoutId) return workoutId
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert([{ profile_id: profileId, session_date: new Date().toISOString(), duration_seconds: 0 }])
      .select()
      .single()
    if (error) { console.error(error); return null }
    setWorkoutId(data.id)
    return data.id
  }

  const addExercise = async (exercise: any) => {
    const wId = await ensureWorkout()
    if (!wId) return
    // Don't add duplicate
    if (exercises.some((e) => e.exercise.id === exercise.id)) return
    const { data, error } = await supabase
      .from('workout_exercises')
      .insert([{ session_id: wId, exercise_id: exercise.id, order_index: exercises.length }])
      .select()
      .single()
    if (error) { console.error(error); return }
    setExercises((prev) => [...prev, { exercise, workoutExerciseId: data.id }])
    // Hide browser after adding
    setShowMyExercises(false)
  }

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx))
  }

  const finishWorkout = async () => {
    if (!workoutId) return
    setFinishing(true)
    await supabase
      .from('workout_sessions')
      .update({ duration_seconds: elapsed })
      .eq('id', workoutId)
    setFinishing(false)
    setFinished(true)
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle size={56} className="text-green-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pass sparat!</h2>
        <p className="text-gray-500">Tid: {fmt(elapsed)} · {exercises.length} övningar</p>
        <Button onClick={() => { setFinished(false); setWorkoutId(null); setExercises([]); setShowMyExercises(true) }}>
          Starta nytt pass
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timer */}
      <div className="flex items-center justify-between rounded-xl bg-blue-500 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Clock size={18} />
          <span className="font-mono text-lg font-bold">{fmt(elapsed)}</span>
        </div>
        <span className="text-sm opacity-80">{exercises.length} övningar</span>
      </div>

      {/* Add exercise panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Lägg till övning</span>
        </div>

        {/* Search */}
        <ExerciseSearch onSelect={addExercise} />

        {/* My exercises browser toggle */}
        <button
          onClick={() => setShowMyExercises((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <div className="flex items-center gap-2">
            <History size={15} />
            <span>Mina övningar</span>
          </div>
          {showMyExercises ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showMyExercises && (
          <MyExercisesBrowser profileId={profileId} onSelect={addExercise} />
        )}
      </div>

      {/* Exercise blocks */}
      {exercises.length > 0 && (
        <div className="space-y-3">
          {exercises.map(({ exercise, workoutExerciseId }, idx) => (
            <ExerciseBlock
              key={workoutExerciseId}
              exercise={exercise}
              workoutExerciseId={workoutExerciseId}
              onRemove={() => removeExercise(idx)}
            />
          ))}
        </div>
      )}

      {/* Finish */}
      {exercises.length > 0 && (
        <Button
          onClick={finishWorkout}
          disabled={finishing}
          className="w-full bg-green-500 hover:bg-green-600"
        >
          {finishing ? 'Sparar...' : '✓ Avsluta & spara pass'}
        </Button>
      )}
    </div>
  )
}
