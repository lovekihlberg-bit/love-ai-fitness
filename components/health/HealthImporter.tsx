'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/common'
import { Upload, CheckCircle, AlertCircle, FileJson, FileText } from 'lucide-react'
import supabase from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/contexts/UserContext'

interface ImportStats {
  sleep: number
  heartRate: number
  hrv: number
  weight: number
  vo2max: number
  metrics: number
  errors: number
}

// ─── Parsers ────────────────────────────────────────────────────────────────────

function parseHealthAutoExport(json: any, profileId: string) {
  const rows: any = { sleep: [], heartRate: [], hrv: [], weight: [], vo2max: [], metrics: [] }

  const metrics = json.data?.metrics || json.metrics || []

  for (const metric of metrics) {
    const key = metric.name || metric.identifier || ''
    const data = metric.data || []

    for (const entry of data) {
      const ts = entry.date || entry.startDate || entry.endDate
      if (!ts) continue
      const val = parseFloat(entry.qty || entry.value || entry.Avg || 0)
      if (isNaN(val)) continue

      if (key.toLowerCase().includes('sleep') || key.toLowerCase().includes('inbed')) {
        rows.sleep.push({ profile_id: profileId, start_time: ts, duration_minutes: Math.round(val * 60), created_at: new Date().toISOString() })
      } else if (key.toLowerCase().includes('heartratevariability') || key.toLowerCase().includes('hrv')) {
        rows.hrv.push({ profile_id: profileId, timestamp: ts, hrv_ms: val })
      } else if (key.toLowerCase().includes('heartrate') || key.toLowerCase().includes('heart_rate')) {
        rows.heartRate.push({ profile_id: profileId, timestamp: ts, heart_rate: Math.round(val), source: 'health_export' })
      } else if (key.toLowerCase().includes('bodymass') || key.toLowerCase().includes('weight')) {
        rows.weight.push({ profile_id: profileId, timestamp: ts, weight_kg: val })
      } else if (key.toLowerCase().includes('vo2max') || key.toLowerCase().includes('vo2_max')) {
        rows.vo2max.push({ profile_id: profileId, timestamp: ts, vo2_value: val })
      } else {
        rows.metrics.push({ profile_id: profileId, metric_name: key, metric_key: key.toLowerCase().replace(/\s+/g, '_'), value: val, timestamp: ts, unit: metric.units || '' })
      }
    }
  }
  return rows
}

function parseAppleHealthCSV(text: string, profileId: string) {
  const lines = text.split('\n').filter(Boolean)
  if (lines.length < 2) return null
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"/, '').replace(/"$/, ''))
  const rows: any = { sleep: [], heartRate: [], hrv: [], weight: [], vo2max: [], metrics: [] }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"/, '').replace(/"$/, ''))
    const row: any = {}
    headers.forEach((h, idx) => { row[h] = cols[idx] })

    const type = (row.type || row.Type || '').toLowerCase()
    const ts = row.startDate || row.date || row.Date
    const val = parseFloat(row.value || row.qty || 0)
    if (!ts || isNaN(val)) continue

    if (type.includes('sleep')) rows.sleep.push({ profile_id: profileId, start_time: ts, duration_minutes: Math.round(val * 60), created_at: new Date().toISOString() })
    else if (type.includes('heartratevariability')) rows.hrv.push({ profile_id: profileId, timestamp: ts, hrv_ms: val })
    else if (type.includes('heartrate')) rows.heartRate.push({ profile_id: profileId, timestamp: ts, heart_rate: Math.round(val), source: 'csv' })
    else if (type.includes('bodymass')) rows.weight.push({ profile_id: profileId, timestamp: ts, weight_kg: val })
    else if (type.includes('vo2max')) rows.vo2max.push({ profile_id: profileId, timestamp: ts, vo2_value: val })
    else rows.metrics.push({ profile_id: profileId, metric_name: type, metric_key: type.replace(/\s+/g, '_'), value: val, timestamp: ts, unit: row.unit || '' })
  }
  return rows
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function HealthDataImporter() {
  const { user } = useUser()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'importing' | 'done' | 'error'>('idle')
  const [stats, setStats] = useState<ImportStats | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [drag, setDrag] = useState(false)

  // Get profile id — fall back to Supabase session if context not ready
  const getProfile = async (): Promise<string | null> => {
    if (user?.id) return user.id
    // Fallback: fetch from Supabase auth session directly
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', session.user.id)
      .single()
    return profile?.id || null
  }

  const processFile = async (f: File) => {
    setFile(f)
    setStatus('idle')
    setStats(null)
    setErrorMsg('')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [])

  const importData = async () => {
    if (!file) return
    const pId = await getProfile()
    if (!pId) { setErrorMsg('Kunde inte hitta profil'); setStatus('error'); return }

    setStatus('parsing')
    const text = await file.text()
    let parsed: any = null

    try {
      if (file.name.endsWith('.json')) {
        const json = JSON.parse(text)
        parsed = parseHealthAutoExport(json, pId)
      } else if (file.name.endsWith('.csv')) {
        parsed = parseAppleHealthCSV(text, pId)
      } else {
        setErrorMsg('Filformat stöds ej. Använd .json eller .csv')
        setStatus('error')
        return
      }
    } catch {
      setErrorMsg('Kunde inte läsa filen. Kontrollera att den är giltig JSON/CSV.')
      setStatus('error')
      return
    }

    if (!parsed) { setErrorMsg('Ingen data hittades i filen.'); setStatus('error'); return }

    setStatus('importing')
    const result: ImportStats = { sleep: 0, heartRate: 0, hrv: 0, weight: 0, vo2max: 0, metrics: 0, errors: 0 }

    const batchInsert = async (table: string, rows: any[], key: keyof ImportStats) => {
      if (!rows.length) return
      // Insert in chunks of 500
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500)
        const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'profile_id,timestamp' }).select('id')
        if (error) result.errors += chunk.length
        else result[key] = (result[key] as number) + chunk.length
      }
    }

    await batchInsert('sleep_data', parsed.sleep, 'sleep')
    await batchInsert('heart_rate_data', parsed.heartRate, 'heartRate')
    await batchInsert('hrv_data', parsed.hrv, 'hrv')
    await batchInsert('bodyweight_data', parsed.weight, 'weight')
    await batchInsert('vo2max_data', parsed.vo2max, 'vo2max')

    // Health metrics (no upsert conflict key needed)
    if (parsed.metrics.length) {
      for (let i = 0; i < parsed.metrics.length; i += 500) {
        const { error } = await supabase.from('health_metrics').insert(parsed.metrics.slice(i, i + 500))
        if (error) result.errors += 500
        else result.metrics += 500
      }
    }

    setStats(result)
    setStatus('done')
    setFile(null)
  }

  const total = stats ? stats.sleep + stats.heartRate + stats.hrv + stats.weight + stats.vo2max + stats.metrics : 0

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          drag ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
        }`}
      >
        <Upload className="mx-auto mb-3 text-gray-400" size={32} />
        <p className="font-medium text-gray-900 dark:text-gray-100">Dra fil hit eller klicka för att välja</p>
        <p className="mt-1 text-sm text-gray-500">Health Auto Export JSON · Apple Health CSV</p>

        <label className="mt-4 inline-block cursor-pointer">
          <span className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
            Välj fil
          </span>
          <input
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
          />
        </label>
      </div>

      {/* Selected file */}
      {file && status === 'idle' && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
          {file.name.endsWith('.json') ? <FileJson size={20} className="text-blue-500" /> : <FileText size={20} className="text-blue-500" />}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-blue-900 dark:text-blue-100">{file.name}</p>
            <p className="text-xs text-blue-600">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <Button onClick={importData} className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white">
            Importera
          </Button>
        </div>
      )}

      {/* Progress */}
      {(status === 'parsing' || status === 'importing') && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {status === 'parsing' ? 'Analyserar fil...' : 'Importerar till databasen...'}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle size={20} className="shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{errorMsg}</p>
        </div>
      )}

      {/* Success */}
      {status === 'done' && stats && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <p className="font-semibold text-green-800 dark:text-green-300">Importering klar! {total} poster importerade</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'Sömn', val: stats.sleep },
              { label: 'Puls', val: stats.heartRate },
              { label: 'HRV', val: stats.hrv },
              { label: 'Kroppsvikt', val: stats.weight },
              { label: 'VO2 Max', val: stats.vo2max },
              { label: 'Övriga', val: stats.metrics },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between rounded-lg bg-white px-3 py-1.5 dark:bg-gray-800">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="font-medium text-green-700 dark:text-green-400">{val}</span>
              </div>
            ))}
          </div>
          {stats.errors > 0 && (
            <p className="mt-2 text-xs text-orange-600">{stats.errors} poster kunde inte importeras (duplikater eller fel)</p>
          )}
        </div>
      )}
    </div>
  )
}
