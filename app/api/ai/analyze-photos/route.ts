import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { photoIds, profileId } = await request.json()
    if (!photoIds?.length || !profileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch photos and user data
    const [photos, bodyweight, workouts] = await Promise.all([
      supabase.from('progress_photos').select('*').in('id', photoIds).eq('profile_id', profileId).order('taken_at'),
      supabase.from('bodyweight_data').select('timestamp, weight_kg').eq('profile_id', profileId).order('timestamp', { ascending: false }).limit(30),
      supabase.from('workout_sessions').select('session_date').eq('profile_id', profileId).order('session_date', { ascending: false }).limit(30),
    ])

    if (!photos.data?.length) {
      return NextResponse.json({ error: 'Photos not found' }, { status: 404 })
    }

    // Fetch images from storage
    const imagePromises = photos.data.map(async (photo) => {
      const { data } = await supabase.storage.from('progress-photos').download(photo.storage_path)
      if (!data) return null
      const buffer = await data.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = photo.storage_path.endsWith('.png') ? 'image/png' : 'image/jpeg'
      return { photo, base64, mimeType }
    })

    const images = (await Promise.all(imagePromises)).filter(Boolean)
    if (!images.length) {
      return NextResponse.json({ error: 'Could not load images' }, { status: 500 })
    }

    const weightHistory = bodyweight.data?.map((w) =>
      `${new Date(w.timestamp).toLocaleDateString('sv-SE')}: ${w.weight_kg} kg`
    ).join('\n') || 'Ingen viktdata'

    const trainingSessions = workouts.data?.length || 0

    const prompt = `Du är en träningscoach och analyserar progressbilder.

${images.length > 1 ? `Det finns ${images.length} bilder tagna vid olika tillfällen:` : 'Det finns en progressbild:'}
${photos.data.map((p, i) => `Bild ${i + 1}: ${new Date(p.taken_at).toLocaleDateString('sv-SE')}${p.weight_kg ? `, ${p.weight_kg} kg` : ''}${p.notes ? `, ${p.notes}` : ''}`).join('\n')}

Vikthistorik (senaste 30 mätningar):
${weightHistory}

Antal träningspass (senaste 30): ${trainingSessions}

Analysera bilderna och ge feedback på svenska om:
1. Synliga fysiska förändringar (muskelmassa, definition, fettprocent visuellt)
2. Koppling till tränings- och viktdata
3. Konkreta rekommendationer för fortsatt progress
4. Vad som är bra och vad som kan förbättras

Var specifik och konkret baserat på vad du faktiskt ser i bilderna.`

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const imageParts = images.map((img: any) => ({
      inlineData: { data: img.base64, mimeType: img.mimeType }
    }))

    const result = await model.generateContent([prompt, ...imageParts])
    const analysis = result.response.text()

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Photo analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
