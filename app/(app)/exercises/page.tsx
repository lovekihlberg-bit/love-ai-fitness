'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardTitle, Badge } from '@/components/ui/common'
import { useExercises } from '@/lib/hooks/useSupabase'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'

const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cable', 'Kettlebell', 'Band']
const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Quadriceps', 'Hamstrings', 'Glutes', 'Biceps', 'Triceps', 'Core', 'Calves']

export default function ExercisesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [debugError, setDebugError] = useState<string>('')
  const { exercises, loading } = useExercises(searchTerm, 100, muscleFilter, equipmentFilter)

  // Direct debug query
  useEffect(() => {
    import('@/lib/hooks/useSupabase').then(({ default: supabase }) => {
      supabase.from('exercises').select('id', { count: 'exact', head: true }).then(({ count, error }) => {
        if (error) setDebugError(`DB Error: ${error.message}`)
        else setDebugError(`DB count: ${count}`)
      })
    })
  }, [])

  return (
    <Layout>
      <div className="space-y-4 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Övningsbibliotek</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Söker...' : `${exercises.length} övningar`}
            {debugError && <span className="ml-2 text-xs text-yellow-500">({debugError})</span>}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Sök övning (Bench Press, Squat...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Equipment filter */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Utrustning</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEquipmentFilter('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !equipmentFilter ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Alla
            </button>
            {EQUIPMENT.map((eq) => (
              <button
                key={eq}
                onClick={() => setEquipmentFilter(equipmentFilter === eq ? '' : eq)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  equipmentFilter === eq ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* Muscle filter */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Muskelgrupp</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMuscleFilter('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !muscleFilter ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Alla
            </button>
            {MUSCLES.map((m) => (
              <button
                key={m}
                onClick={() => setMuscleFilter(muscleFilter === m ? '' : m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  muscleFilter === m ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-gray-400">Söker övningar...</div>
          ) : exercises.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-500">
                {searchTerm || muscleFilter || equipmentFilter
                  ? 'Ingen övning matchade sökningen.'
                  : 'Övningsdatabasen är tom. Importera övningar för att komma igång.'}
              </p>
            </div>
          ) : (
            exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <button
                  className="flex w-full items-center justify-between p-4 text-left"
                  onClick={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{exercise.name_en}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {exercise.primary_muscles?.slice(0, 3).map((m: string) => (
                        <span key={m} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">{m}</span>
                      ))}
                      {exercise.equipment?.slice(0, 2).map((e: string) => (
                        <span key={e} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">{e}</span>
                      ))}
                      {exercise.difficulty && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">{exercise.difficulty}</span>
                      )}
                    </div>
                  </div>
                  {expandedId === exercise.id ? <ChevronUp size={16} className="shrink-0 text-gray-400" /> : <ChevronDown size={16} className="shrink-0 text-gray-400" />}
                </button>

                {expandedId === exercise.id && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700">
                    {/* Exercise image */}
                    <div className="mb-3 flex justify-center">
                      {exercise.image_url ? (
                        <img
                          src={exercise.image_url}
                          alt={exercise.name_en}
                          className="h-48 w-auto rounded-xl object-contain bg-zinc-900"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="flex h-36 w-full items-center justify-center rounded-xl bg-zinc-800 border border-white/5">
                          <div className="text-center">
                            <div className="text-3xl mb-1">
                              {exercise.primary_muscles?.[0] === 'Chest' ? '💪' :
                               exercise.primary_muscles?.[0] === 'Back' ? '🏋️' :
                               exercise.primary_muscles?.[0] === 'Shoulders' ? '🔝' :
                               exercise.primary_muscles?.[0] === 'Biceps' ? '💪' :
                               exercise.primary_muscles?.[0] === 'Triceps' ? '💪' :
                               exercise.primary_muscles?.[0] === 'Quadriceps' ? '🦵' :
                               exercise.primary_muscles?.[0] === 'Hamstrings' ? '🦵' :
                               exercise.primary_muscles?.[0] === 'Glutes' ? '🍑' :
                               exercise.primary_muscles?.[0] === 'Core' ? '🎯' :
                               exercise.category === 'Cardio' ? '🏃' : '🏋️'}
                            </div>
                            <p className="text-xs text-zinc-500">{exercise.primary_muscles?.[0] || exercise.category}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {exercise.instructions_sv || exercise.instructions_en ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {exercise.instructions_sv || exercise.instructions_en}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">Inga instruktioner tillgängliga.</p>
                    )}
                    {exercise.secondary_muscles?.length > 0 && (
                      <p className="mt-2 text-xs text-gray-500">
                        Sekundära: {exercise.secondary_muscles.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}
