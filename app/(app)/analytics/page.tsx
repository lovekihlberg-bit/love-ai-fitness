'use client'

import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import {
  HRVChart,
  RestingHeartRateChart,
  VO2MaxChart,
  BodyweightChart,
  SleepChart,
  AnalyticsChart,
} from '@/components/analytics/AnalyticsCharts'

const TABS = [
  { id: 'sleep',      label: 'Sömn'         },
  { id: 'hrv',        label: 'HRV'          },
  { id: 'resting-hr', label: 'Vilopuls'     },
  { id: 'vo2',        label: 'VO2 Max'      },
  { id: 'weight',     label: 'Kroppsvikt'   },
  { id: 'steps',      label: 'Aktivitet'    },
  { id: 'recovery',   label: 'Återhämtning' },
]

function TabContent({ id }: { id: string }) {
  switch (id) {
    case 'sleep':      return <SleepChart />
    case 'hrv':        return <HRVChart />
    case 'resting-hr': return <RestingHeartRateChart />
    case 'vo2':        return <VO2MaxChart />
    case 'weight':     return <BodyweightChart />
    case 'steps':      return <AnalyticsChart metricKey="steps" metricName="Steg per dag" unit="steg" color="#06B6D4" />
    case 'recovery':   return <AnalyticsChart metricKey="recovery_score" metricName="Återhämtning" unit="poäng" color="#F59E0B" />
    default:           return null
  }
}

export default function AnalyticsPage() {
  const [active, setActive] = useState('sleep')

  return (
    <Layout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Statistik</h1>
          <p className="text-sm text-zinc-500">Visualisera dina hälso- och träningsdata</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-800/60 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active === tab.id
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <TabContent id={active} />
      </div>
    </Layout>
  )
}
