import { Layout } from '@/components/layout/Layout'
import {
  RecoveryScore,
  HealthMetricsGrid,
  TrainingStreak,
  LatestPR,
  QuickActions,
} from '@/components/dashboard/DashboardCards'

export default function DashboardPage() {
  return (
    <Layout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Instrumentpanel</h1>
          <p className="text-gray-600 dark:text-gray-400">Välkommen tillbaka! Här är din trainingöversikt.</p>
        </div>

        <QuickActions />

        <HealthMetricsGrid />

        <div className="grid gap-4 sm:grid-cols-2">
          <RecoveryScore />
          <TrainingStreak />
        </div>

        <LatestPR />
      </div>
    </Layout>
  )
}
