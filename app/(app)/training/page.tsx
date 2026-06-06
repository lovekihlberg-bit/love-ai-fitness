'use client'

import { Layout } from '@/components/layout/Layout'
import { WorkoutSession } from '@/components/training/WorkoutLogger'
import { useUser } from '@/lib/contexts/UserContext'

export default function TrainingPage() {
  const { user } = useUser()
  const profileId = user?.id || null

  return (
    <Layout>
      <div className="space-y-4 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Träningspass</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Logga set, reps och vikt direkt i databasen</p>
        </div>

        {profileId ? (
          <WorkoutSession profileId={profileId} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 py-12 text-center text-gray-400 dark:border-gray-700 dark:bg-gray-800">
            Laddar profil...
          </div>
        )}
      </div>
    </Layout>
  )
}
