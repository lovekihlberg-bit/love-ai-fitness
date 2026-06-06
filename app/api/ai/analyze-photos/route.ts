import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { photoIds, profileId } = await request.json()
    if (!photoIds?.length || !profileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const [photos, bodyweight, workouts] = await Promise.all([
      supabase.from('progress_photos').select('*').in('id', photoIds).eq('profile_id', profileId).order('taken_at'),
      supabase.from('bodyweight_data').select('timestamp, weight_kg').eq('profile_id', profileId).order('timestamp', { ascending: false }).limit(30),
      supabase.from('workout_sessions').select('session_date').eq('profile_id', profileId).order('session_date', { ascending: false }).limit(30),
    ])

    if (!photos.data?.length) {
      return NextResponse.json({ error: 'Photos not found' }, { status: 404 })
    }

    const weightHistory = bodyweight.data?.map((w: any) =>
      `${new Date(w.timestamp).toLocaleDateString('sv-SE')}: ${w.weight_kg} kg`
    ).join('\n') || 'Ingen viktdata'

    const trainingSessions = workouts.data?.length || 0
    const photoList = photos.data.map((p: any, i: number) =>
      `Bild ${i + 1}: ${new Date(p.taken_at).toLocaleDateString('sv-SE')}${p.weight_kg ? `, ${p.weight_kg} kg` : ''}`
    ).join('\n')

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Du är en träningscoach. Analysera träningsprogress baserat på data och ge konkreta råd på svenska.',
          },
          {
            role: 'user',
            content: `Analysera följande progressdata:\n\nBilder:\n${photoList}\n\nVikthistorik:\n${weightHistory}\n\nAntal träningspass (senaste 30): ${trainingSessions}\n\nGe feedback på svenska om synlig progress och rekommendationer.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    const groqData = await groqRes.json()
    const analysis = groqData.choices?.[0]?.message?.content || 'Kunde inte analysera.'

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Photo analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
