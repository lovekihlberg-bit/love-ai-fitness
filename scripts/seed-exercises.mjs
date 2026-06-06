/**
 * LOVE AI FITNESS — Exercise Seeder
 * Hämtar 2000+ övningar från wger.de (open source) och importerar till Supabase
 *
 * Kör med: node scripts/seed-exercises.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import ws from 'ws'

// Läs .env.local
const env = {}
try {
  readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length) env[k.trim()] = v.join('=').trim()
  })
} catch { console.error('❌ Kunde inte läsa .env.local'); process.exit(1) }

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws }
})

const MUSCLE_MAP = {
  1: 'Biceps', 2: 'Anterior deltoid', 3: 'Serratus anterior', 4: 'Chest',
  5: 'Triceps', 6: 'Abs', 7: 'Quadriceps', 8: 'Glutes', 9: 'Calves',
  10: 'Hamstrings', 11: 'Shoulders', 12: 'Trapezius', 13: 'Lats',
  14: 'Obliques', 15: 'Back'
}

const EQUIPMENT_MAP = {
  1: 'Barbell', 2: 'SZ-Bar', 3: 'Dumbbell', 4: 'Gym mat',
  5: 'Swiss ball', 6: 'Pull-up bar', 7: 'Bodyweight', 8: 'Bench',
  9: 'Incline bench', 10: 'Kettlebell', 11: 'Cable', 12: 'Machine'
}

async function fetchAll(url) {
  const results = []
  let next = url
  while (next) {
    const res = await fetch(next)
    if (!res.ok) break
    const data = await res.json()
    results.push(...(data.results || []))
    next = data.next
    process.stdout.write(`\r  Hämtar... ${results.length} poster`)
  }
  console.log()
  return results
}

async function main() {
  console.log('🏋️  LOVE AI FITNESS — Exercise Seeder\n')

  // 1. Hämta övningsinfo (engelska)
  console.log('📥 Hämtar övningsinfo...')
  const translations = await fetchAll('https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=100')

  if (!translations.length) {
    console.error('❌ Kunde inte nå wger API. Kontrollera din internetanslutning.')
    process.exit(1)
  }

  console.log(`✅ ${translations.length} övningar hämtade\n`)

  // 2. Transformera data
  const exercises = translations.map(ex => {
    const enTranslation = ex.translations?.find(t => t.language === 2) || ex.translations?.[0] || {}
    const name = enTranslation.name || ex.name || `Exercise ${ex.id}`
    const instructions = enTranslation.description?.replace(/<[^>]*>/g, '').trim() || ''

    const primaryMuscles = (ex.muscles || []).map(m => MUSCLE_MAP[m.id] || m.name_en).filter(Boolean)
    const secondaryMuscles = (ex.muscles_secondary || []).map(m => MUSCLE_MAP[m.id] || m.name_en).filter(Boolean)
    const equipment = (ex.equipment || []).map(e => EQUIPMENT_MAP[e.id] || e.name).filter(Boolean)

    return {
      name_en: name,
      instructions_en: instructions || null,
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles,
      equipment: equipment,
      category: ex.category?.name || 'General',
      difficulty: ex.license_author ? 'Intermediate' : 'Beginner',
      tags: [
        ...primaryMuscles.map(m => m.toLowerCase()),
        ...equipment.map(e => e.toLowerCase()),
        ex.category?.name?.toLowerCase()
      ].filter(Boolean),
    }
  }).filter(ex => ex.name_en && ex.name_en.length > 1)

  console.log(`🔄 Importerar ${exercises.length} övningar till Supabase...\n`)

  // 3. Insert i batches
  let imported = 0
  let errors = 0
  const BATCH = 100

  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH)
    const { error } = await supabase
      .from('exercises')
      .upsert(batch, { onConflict: 'name_en', ignoreDuplicates: true })

    if (error) {
      errors += batch.length
      console.error(`  ⚠️  Batch ${i}-${i + BATCH}: ${error.message}`)
    } else {
      imported += batch.length
    }
    process.stdout.write(`\r  Importerat: ${imported} / ${exercises.length}`)
  }

  console.log(`\n\n✅ Klar! ${imported} övningar importerade, ${errors} fel.\n`)
  console.log('🔍 Sök nu efter övningar i appen på http://localhost:3000/exercises')
}

main().catch(console.error)
