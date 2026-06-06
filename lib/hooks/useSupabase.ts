'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Hook to fetch health metrics with real-time updates
export function useHealthMetrics(profileId: string, metricKey: string, days: number = 30) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!profileId) return

    const fetchMetrics = async () => {
      try {
        const since = new Date()
        since.setDate(since.getDate() - days)

        const { data: metrics, error: err } = await supabase
          .from('health_metrics')
          .select('*')
          .eq('profile_id', profileId)
          .eq('metric_key', metricKey)
          .gte('timestamp', since.toISOString())
          .order('timestamp', { ascending: true })

        if (err) throw err
        setData(metrics || [])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`health_metrics_${profileId}_${metricKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_metrics',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          if (payload.new.metric_key === metricKey) {
            setData((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [profileId, metricKey, days])

  return { data, loading, error }
}

// Hook to fetch exercises with search and filters
export function useExercises(
  searchTerm: string = '',
  limit: number = 50,
  muscleFilter: string = '',
  equipmentFilter: string = '',
  categoryFilter: string = ''
) {
  const [exercises, setExercises] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true)
      try {
        let query = supabase.from('exercises').select('id, name_en, instructions_en, instructions_sv, primary_muscles, secondary_muscles, equipment, category, difficulty, tags, image_url').limit(limit)

        if (searchTerm.trim()) {
          query = query.ilike('name_en', `%${searchTerm.trim()}%`)
        }
        if (muscleFilter) {
          query = query.overlaps('primary_muscles', [muscleFilter])
        }
        if (equipmentFilter) {
          query = query.overlaps('equipment', [equipmentFilter])
        }
        if (categoryFilter) {
          query = query.ilike('category', `%${categoryFilter}%`)
        }

        query = query.order('name_en', { ascending: true })

        const { data, error } = await query
        if (error) throw error
        setExercises(data || [])
      } catch (err) {
        console.error('Error fetching exercises:', err)
        setExercises([])
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchExercises, 250)
    return () => clearTimeout(debounce)
  }, [searchTerm, limit, muscleFilter, equipmentFilter, categoryFilter])

  return { exercises, loading }

}

// Hook to fetch previous workout performance for exercise
export function usePreviousPerformance(profileId: string, exerciseId: string) {
  const [performance, setPerformance] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profileId || !exerciseId) return

    const fetchPerformance = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('exercise_sets')
          .select(`
            weight, reps, rpe, duration_seconds, created_at,
            workout_exercises!inner(
              workout_sessions!inner(
                session_date
              )
            )
          `)
          .eq('workout_exercises.exercise_id', exerciseId)
          .eq('workout_exercises.workout_sessions.profile_id', profileId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) throw error
        setPerformance(data?.[0] || null)
      } catch (err) {
        console.error('Error fetching previous performance:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPerformance()
  }, [profileId, exerciseId])

  return { performance, loading }
}

// Hook to fetch workout history
export function useWorkoutHistory(profileId: string, limit: number = 20) {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return

    const fetchWorkouts = async () => {
      try {
        const { data, error } = await supabase
          .from('workout_sessions')
          .select(`
            id, session_date, duration_seconds, notes,
            workout_exercises(
              id, exercise_id, exercises(name_en),
              exercise_sets(weight, reps, rpe)
            )
          `)
          .eq('profile_id', profileId)
          .order('session_date', { ascending: false })
          .limit(limit)

        if (error) throw error
        setWorkouts(data || [])
      } catch (err) {
        console.error('Error fetching workouts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkouts()
  }, [profileId, limit])

  return { workouts, loading }
}

// Hook to fetch personal records
export function usePersonalRecords(profileId: string) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return

    const fetchRecords = async () => {
      try {
        const { data, error } = await supabase
          .from('personal_records')
          .select('*, exercises(name_en)')
          .eq('profile_id', profileId)
          .order('achieved_at', { ascending: false })

        if (error) throw error
        setRecords(data || [])
      } catch (err) {
        console.error('Error fetching PRs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [profileId])

  return { records, loading }
}

export default supabase
