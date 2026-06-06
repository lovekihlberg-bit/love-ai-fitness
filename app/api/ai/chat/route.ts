import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { message, profileId, conversationId } = await request.json()
    if (!message || !profileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY saknas i .env.local' }, { status: 500 })
    }

    // Fetch all user data in parallel
    const [profile, recentWorkouts, allWorkouts, personalRecords, sleepData, hrvData, bodyweight, vo2max] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).single(),
      supabase.from('workout_sessions').select(`
        id, session_date, duration_seconds, notes,
        workout_exercises(id, order_index,
          exercises(name_en, primary_muscles, category),
          exercise_sets(weight, reps, rpe)
        )
      `).eq('profile_id', profileId).order('session_date', { ascending: false }).limit(10),
      supabase.from('workout_sessions').select('session_date').eq('profile_id', profileId).order('session_date', { ascending: false }).limit(100),
      supabase.from('personal_records').select('*, exercises(name_en)').eq('profile_id', profileId).order('achieved_at', { ascending: false }).limit(20),
      supabase.from('sleep_data').select('start_time, end_time, duration_minutes').eq('profile_id', profileId).order('start_time', { ascending: false }).limit(14),
      supabase.from('hrv_data').select('timestamp, hrv_ms').eq('profile_id', profileId).order('timestamp', { ascending: false }).limit(14),
      supabase.from('bodyweight_data').select('timestamp, weight_kg').eq('profile_id', profileId).order('timestamp', { ascending: false }).limit(30),
      supabase.from('vo2max_data').select('timestamp, vo2_value').eq('profile_id', profileId).order('timestamp', { ascending: false }).limit(10),
    ])

    const workoutDates = allWorkouts.data?.map((w) => new Date(w.session_date)) || []
    const last30Days = workoutDates.filter((d) => d > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
    const last7Days = workoutDates.filter((d) => d > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
    const avgSleep = sleepData.data?.length
      ? Math.round(sleepData.data.reduce((a, b) => a + (b.duration_minutes || 0), 0) / sleepData.data.length)
      : null
    const avgHRV = hrvData.data?.length
      ? Math.round(hrvData.data.reduce((a, b) => a + (b.hrv_ms || 0), 0) / hrvData.data.length)
      : null
    const latestWeight = bodyweight.data?.[0]?.weight_kg || null
    const latestVO2 = vo2max.data?.[0]?.vo2_value || null

    const workoutHistory = recentWorkouts.data?.map((w) => {
      const exList = w.workout_exercises?.map((we: any) => {
        const sets = we.exercise_sets?.map((s: any) =>
          `${s.weight}kg×${s.reps}${s.rpe ? ` @RPE${s.rpe}` : ''}`
        ).join(', ')
        return `${we.exercises?.name_en}: ${sets || 'inga set'}`
      }).join(' | ')
      return `[${new Date(w.session_date).toLocaleDateString('sv-SE')}] ${exList || 'tomt pass'}`
    }).join('\n') || 'Ingen träningshistorik ännu'

    const prList = personalRecords.data?.map((pr: any) =>
      `${pr.exercises?.name_en}: ${pr.value} ${pr.unit}`
    ).join('\n') || 'Inga personliga rekord ännu'

    const systemPrompt = `Du är en expert personlig tränare och coach för ${profile.data?.full_name || 'användaren'}.
Ge konkreta, personaliserade råd baserade på DERAS verkliga data — aldrig generiska program.

PROFIL: ${profile.data?.full_name || 'okänt'} | Vikt: ${latestWeight ? `${latestWeight} kg` : 'ingen data'} | VO2 Max: ${latestVO2 || 'ingen data'}
TRÄNINGSFREKVENS: ${last7Days} pass/vecka, ${last30Days} pass/månad
SÖMN: ${avgSleep ? `${Math.floor(avgSleep / 60)}h ${avgSleep % 60}min snitt` : 'ingen data'}
HRV: ${avgHRV ? `${avgHRV} ms snitt` : 'ingen data'}

PERSONLIGA REKORD:
${prList}

SENASTE TRÄNINGSPASS:
${workoutHistory}

Svara ALLTID på svenska. Skapa konkreta program med specifika vikter/sets/reps baserat på verklig data.`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!groqRes.ok) {
      const errBody = await groqRes.text()
      console.error('Groq API error:', groqRes.status, errBody)
      return NextResponse.json(
        { error: `Groq API fel (${groqRes.status}): ${errBody.slice(0, 300)}` },
        { status: 500 }
      )
    }

    const groqData = await groqRes.json()
    const responseText = groqData.choices?.[0]?.message?.content

    if (!responseText) {
      return NextResponse.json({ error: 'Inget svar från Groq.' }, { status: 500 })
    }

    if (conversationId) {
      try {
        await supabase.from('ai_conversations').insert([{
          profile_id: profileId,
          conversation_id: conversationId,
          user_message: message,
          assistant_message: responseText,
          created_at: new Date().toISOString(),
        }])
      } catch (_) {}
    }

    return NextResponse.json({ response: responseText, conversationId })
  } catch (error: any) {
    console.error('AI Coach error:', error)
    return NextResponse.json({ error: `Serverfel: ${error?.message || 'okänt fel'}` }, { status: 500 })
  }
}
