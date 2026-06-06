'use client'

import React, { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardTitle, CardContent, Badge, Tabs } from '@/components/ui/common'
import { useUser } from '@/lib/contexts/UserContext'
import { useHealthMetrics } from '@/lib/hooks/useSupabase'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface AnalyticsChartProps {
  metricKey: string
  metricName: string
  unit: string
  color: string
  days?: number
}

export function AnalyticsChart({
  metricKey,
  metricName,
  unit,
  color,
  days = 30,
}: AnalyticsChartProps) {
  const { user } = useUser()
  const { data } = useHealthMetrics(user?.id || '', metricKey, days)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  // Filter data by time range
  const filteredData = data
    .filter((d) => {
      const date = new Date(d.timestamp)
      const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
      const daysLimit = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      return daysAgo <= daysLimit
    })
    .map((d) => ({
      date: new Date(d.timestamp).toLocaleDateString('sv-SE'),
      value: d.value,
      timestamp: d.timestamp,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Calculate stats
  const values = filteredData.map((d) => d.value)
  const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '0'
  const min = values.length > 0 ? Math.min(...values).toFixed(1) : '0'
  const max = values.length > 0 ? Math.max(...values).toFixed(1) : '0'
  const trend = values.length > 1 ? (values[values.length - 1] - values[0]).toFixed(1) : '0'

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>{metricName}</CardTitle>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {filteredData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={color} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>

          <CardContent className="mt-4">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-xs text-gray-500">Genomsnitt</div>
                <div className="text-lg font-bold">{avg}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Min</div>
                <div className="text-lg font-bold">{min}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Max</div>
                <div className="text-lg font-bold">{max}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Trend</div>
                <div className={`flex items-center text-lg font-bold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {trend}
                </div>
              </div>
            </div>
          </CardContent>
        </>
      ) : (
        <div className="flex h-64 items-center justify-center text-gray-500">
          Ingen data tillgänglig
        </div>
      )}
    </Card>
  )
}

export function SleepChart() {
  const { user } = useUser()
  const { data: sleepData } = useHealthMetrics(user?.id || '', 'sleep_duration', 30)

  const chartData = sleepData
    .map((d) => ({
      date: new Date(d.timestamp).toLocaleDateString('sv-SE'),
      duration: d.value / 60, // Convert to hours
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <Card>
      <CardTitle>Sömnmönster</CardTitle>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis label={{ value: 'Timmar', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value.toFixed(1)}h`} />
          <Bar dataKey="duration" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

export function HRVChart() {
  return (
    <AnalyticsChart
      metricKey="hrv_ms"
      metricName="HRV (Hjärtfrekvarvariabilitet)"
      unit="ms"
      color="#3B82F6"
    />
  )
}

export function RestingHeartRateChart() {
  return (
    <AnalyticsChart
      metricKey="resting_heart_rate"
      metricName="Vilopuls"
      unit="bpm"
      color="#EF4444"
    />
  )
}

export function VO2MaxChart() {
  return (
    <AnalyticsChart
      metricKey="vo2_max"
      metricName="VO2 Max"
      unit="ml/kg/min"
      color="#F59E0B"
      days={90}
    />
  )
}

export function BodyweightChart() {
  return (
    <AnalyticsChart
      metricKey="bodyweight"
      metricName="Kroppsvikt"
      unit="kg"
      color="#8B5CF6"
      days={90}
    />
  )
}
