/**
 * LOVE AI FITNESS — Exercise Image Seeder
 * Uses free-exercise-db on GitHub (no API key needed)
 * Run: node scripts/seed-exercise-images.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import ws from 'ws'

const env = {}
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws }
})

const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

async function main() {
  console.log('🖼️  Fetching exercises from free-exercise-db...\n')

  const res = await fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json')
  if (!res.ok) { console.error('❌ Could not fetch exercise database'); process.exit(1) }

  const data = await res.json()
  console.log(`✅ ${data.length} exercises fetched\n`)

  let updated = 0
  let notFound = 0

  for (const ex of data) {
    if (!ex.images?.length) continue

    const imageUrl = `${IMAGE_BASE}/${ex.id}/images/${ex.images[0]}`

    // Try exact match first, then partial match
    const { data: exactMatch } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name_en', ex.name)
      .limit(1)

    let matchId = exactMatch?.[0]?.id

    if (!matchId) {
      // Try: our name is contained in free-exercise-db name
      // e.g. "Bench Press" in "Barbell Bench Press"
      const words = ex.name.split(' ')
      if (words.length >= 2) {
        const { data: partialMatch } = await supabase
          .from('exercises')
          .select('id, name_en')
          .ilike('name_en', `%${words.slice(-2).join(' ')}%`)
          .limit(1)
        matchId = partialMatch?.[0]?.id
      }
    }

    if (!matchId) continue

    const { error } = await supabase
      .from('exercises')
      .update({ image_url: imageUrl })
      .eq('id', matchId)

    if (!error) {
      updated++
      process.stdout.write(`\r  Uppdaterat: ${updated}`)
    } else {
      notFound++
    }
  }

  console.log(`\n\n✅ Klar! ${updated} övningar fick bilder, ${notFound} matchade ej.`)
}

main().catch(console.error)
