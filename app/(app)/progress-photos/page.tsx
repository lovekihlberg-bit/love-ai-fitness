'use client'

import { useState, useEffect, useRef } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/common'
import { Upload, X, GitCompare, Bot } from 'lucide-react'
import supabase from '@/lib/hooks/useSupabase'
import { useUser } from '@/lib/contexts/UserContext'

interface ProgressPhoto {
  id: string
  url: string
  taken_at: string
  weight_kg: number | null
  notes: string | null
}

export default function ProgressPhotosPage() {
  const { user } = useUser()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedForAI, setSelectedForAI] = useState<string[]>([])
  const [compareA, setCompareA] = useState<ProgressPhoto | null>(null)
  const [compareB, setCompareB] = useState<ProgressPhoto | null>(null)
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0])
  const [uploadWeight, setUploadWeight] = useState('')
  const [uploadNotes, setUploadNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) { setProfileId(data.id); fetchPhotos(data.id) } })
  }, [user])

  const fetchPhotos = async (pId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('profile_id', pId)
      .order('taken_at', { ascending: false })
    if (data) {
      const withUrls = await Promise.all(data.map(async (p: any) => {
        const { data: urlData } = supabase.storage.from('progress-photos').getPublicUrl(p.storage_path)
        return { ...p, url: urlData.publicUrl }
      }))
      setPhotos(withUrls)
    }
    setLoading(false)
  }

  const uploadPhoto = async (file: File) => {
    if (!profileId) return
    setUploading(true)
    const path = `${profileId}/${Date.now()}-${file.name}`
    const { error: uploadErr } = await supabase.storage.from('progress-photos').upload(path, file)
    if (uploadErr) { alert('Uppladdning misslyckades: ' + uploadErr.message); setUploading(false); return }

    await supabase.from('progress_photos').insert([{
      profile_id: profileId,
      storage_path: path,
      taken_at: uploadDate,
      weight_kg: uploadWeight ? parseFloat(uploadWeight) : null,
      notes: uploadNotes || null,
    }])
    setUploadWeight('')
    setUploadNotes('')
    fetchPhotos(profileId)
    setUploading(false)
  }

  const deletePhoto = async (photo: ProgressPhoto & { storage_path: string }) => {
    if (!confirm('Ta bort bilden?')) return
    await supabase.storage.from('progress-photos').remove([photo.storage_path])
    await supabase.from('progress_photos').delete().eq('id', photo.id)
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  const handleCompareSelect = (photo: ProgressPhoto) => {
    if (!compareA) { setCompareA(photo); return }
    if (!compareB && photo.id !== compareA.id) { setCompareB(photo); return }
    setCompareA(photo)
    setCompareB(null)
  }

  const analyzeWithAI = async () => {
    const ids = selectedForAI.length > 0 ? selectedForAI : photos.slice(0, 4).map((p) => p.id)
    if (!ids.length || !profileId) return
    setAnalyzing(true)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/ai/analyze-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: ids, profileId }),
      })
      const data = await res.json()
      setAiAnalysis(data.analysis || data.error || 'Kunde inte analysera bilderna.')
    } catch {
      setAiAnalysis('Anslutningsfel.')
    }
    setAnalyzing(false)
  }

  const years = [...new Set(photos.map((p) => new Date(p.taken_at).getFullYear().toString()))]
  const months = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']

  const filtered = photos.filter((p) => {
    const d = new Date(p.taken_at)
    if (filterYear && d.getFullYear().toString() !== filterYear) return false
    if (filterMonth && d.getMonth().toString() !== filterMonth) return false
    return true
  })

  return (
    <Layout>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Progressbilder</h1>
            <p className="text-sm text-gray-500">{photos.length} bilder</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null) }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                compareMode ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <GitCompare size={16} /> Jämför
            </button>
            {photos.length > 0 && (
              <button
                onClick={analyzeWithAI}
                disabled={analyzing}
                className="flex items-center gap-1.5 rounded-xl bg-purple-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Bot size={16} /> {analyzing ? 'Analyserar...' : 'AI-analys'}
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium text-white"
            >
              <Upload size={16} /> Ladda upp
            </button>
          </div>
        </div>

        {/* Upload form */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }}
        />

        <div className="grid grid-cols-3 gap-2">
          <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
          <input type="number" placeholder="Vikt (kg)" value={uploadWeight} onChange={(e) => setUploadWeight(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
          <input type="text" placeholder="Anteckning" value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
        </div>

        {uploading && (
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            Laddar upp bild...
          </div>
        )}

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/10">
            <div className="mb-2 flex items-center gap-2">
              <Bot size={18} className="text-purple-600" />
              <p className="font-semibold text-purple-800 dark:text-purple-300">AI-analys av dina progressbilder</p>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{aiAnalysis}</p>
          </div>
        )}

        {/* Compare view */}
        {compareMode && (compareA || compareB) && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/10">
            <p className="mb-3 text-sm font-medium text-blue-800 dark:text-blue-300">
              {compareA && compareB ? 'Jämförelse' : 'Välj en till bild att jämföra med'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {compareA && (
                <div className="text-center">
                  <img src={compareA.url} alt="" className="w-full rounded-xl object-cover aspect-[3/4]" />
                  <p className="mt-1 text-xs text-gray-600">{new Date(compareA.taken_at).toLocaleDateString('sv-SE')}</p>
                  {compareA.weight_kg && <p className="text-xs text-gray-500">{compareA.weight_kg} kg</p>}
                </div>
              )}
              {compareB && (
                <div className="text-center">
                  <img src={compareB.url} alt="" className="w-full rounded-xl object-cover aspect-[3/4]" />
                  <p className="mt-1 text-xs text-gray-600">{new Date(compareB.taken_at).toLocaleDateString('sv-SE')}</p>
                  {compareB.weight_kg && <p className="text-xs text-gray-500">{compareB.weight_kg} kg</p>}
                </div>
              )}
            </div>
            {compareA && compareB && (
              <button onClick={() => { setCompareA(null); setCompareB(null) }} className="mt-3 text-xs text-blue-600 underline">
                Rensa jämförelse
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <option value="">Alla år</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <option value="">Alla månader</option>
              {months.map((m, i) => <option key={i} value={i.toString()}>{m}</option>)}
            </select>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="py-12 text-center text-gray-400">Laddar bilder...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-600">
            <p className="text-gray-400">Inga bilder än. Ladda upp din första progressbild!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((photo: any) => (
              <div
                key={photo.id}
                className={`relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                  compareMode && (compareA?.id === photo.id || compareB?.id === photo.id)
                    ? 'border-blue-500'
                    : 'border-transparent'
                }`}
                onClick={() => compareMode && handleCompareSelect(photo)}
              >
                <img src={photo.url} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                  <p className="text-xs text-white">{new Date(photo.taken_at).toLocaleDateString('sv-SE')}</p>
                  {photo.weight_kg && <p className="text-xs text-white/80">{photo.weight_kg} kg</p>}
                </div>
                {!compareMode && (
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-red-500"
                  >
                    <X size={12} />
                  </button>
                )}
                {compareMode && (compareA?.id === photo.id || compareB?.id === photo.id) && (
                  <div className="absolute left-2 top-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                    {compareA?.id === photo.id ? 'A' : 'B'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
