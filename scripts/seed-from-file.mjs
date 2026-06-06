/**
 * LOVE AI FITNESS — Seed exercises from gymai-exercises.md
 * Run: node scripts/seed-from-file.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import ws from 'ws'

// Load .env.local
const env = {}
try {
  readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length) env[k.trim()] = v.join('=').trim()
  })
} catch { console.error('❌ Could not read .env.local'); process.exit(1) }

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws }
})

// Muscle group mapping based on exercise name patterns
function inferMuscles(name, category) {
  const n = name.toLowerCase()
  const muscles = []

  if (n.includes('squat') || n.includes('lunge') || n.includes('leg press') || n.includes('step-up')) muscles.push('Quadriceps')
  if (n.includes('deadlift') || n.includes('romanian') || n.includes('nordic curl') || n.includes('leg curl')) muscles.push('Hamstrings')
  if (n.includes('hip thrust') || n.includes('glute bridge') || n.includes('glute') || n.includes('kickback')) muscles.push('Glutes')
  if (n.includes('bench press') || n.includes('chest press') || n.includes('fly') || n.includes('push-up') || n.includes('dip') || n.includes('crossover') || n.includes('pec')) muscles.push('Chest')
  if (n.includes('pull-up') || n.includes('pulldown') || n.includes('lat ') || n.includes('row') || n.includes('chin-up') || n.includes('inverted row')) muscles.push('Back')
  if (n.includes('overhead press') || n.includes('shoulder press') || n.includes('lateral raise') || n.includes('front raise') || n.includes('face pull') || n.includes('rear delt') || n.includes('arnold')) muscles.push('Shoulders')
  if (n.includes('curl') && !n.includes('nordic') && !n.includes('leg curl') && !n.includes('wrist')) muscles.push('Biceps')
  if (n.includes('tricep') || n.includes('skull crusher') || n.includes('pushdown') || n.includes('jm press') || n.includes('close-grip bench') || n.includes('dip') && !n.includes('banded dip')) muscles.push('Triceps')
  if (n.includes('calf') || n.includes('tibialis')) muscles.push('Calves')
  if (n.includes('crunch') || n.includes('sit-up') || n.includes('ab ') || n.includes('plank') || n.includes('hollow') || n.includes('dead bug') || n.includes('leg raise') || n.includes('russian twist')) muscles.push('Core')
  if (n.includes('shrug') || n.includes('trap')) muscles.push('Traps')
  if (n.includes('wrist curl') || n.includes('plate pinch') || n.includes('farmer')) muscles.push('Forearms')

  if (category === 'Cardio' || category === 'Stretching') return []
  if (muscles.length === 0) {
    if (category === 'Olympic Lifting' || category === 'Powerlifting') return ['Full Body']
    if (category === 'Calisthenics') return ['Core']
  }

  return [...new Set(muscles)]
}

function parseMd(content) {
  const exercises = []
  let currentEquipment = ''

  for (const line of content.split('\n')) {
    const h2 = line.match(/^## (.+?) \(\d+\)/)
    if (h2) {
      currentEquipment = h2[1].trim()
      continue
    }
    const item = line.match(/^- (.+)/)
    if (item && currentEquipment) {
      const name = item[1].trim()
      const muscles = inferMuscles(name, currentEquipment)
      exercises.push({
        name_en: name,
        equipment: [currentEquipment],
        category: currentEquipment,
        primary_muscles: muscles,
        secondary_muscles: [],
        difficulty: 'Intermediate',
        tags: [currentEquipment.toLowerCase(), ...muscles.map(m => m.toLowerCase())].filter(Boolean),
      })
    }
  }
  // Deduplicate by name
  const seen = new Set()
  return exercises.filter(e => {
    if (seen.has(e.name_en)) return false
    seen.add(e.name_en)
    return true
  })
}

async function main() {
  console.log('🏋️  LOVE AI FITNESS — Exercise Seeder (from file)\n')

  let mdContent
  try {
    mdContent = readFileSync('scripts/gymai-exercises.md', 'utf-8')
  } catch {
    // Try uploads path
    try {
      const base = process.env.HOME + '/Library/Application Support/Claude/local-agent-mode-sessions'
      const glob = (await import('fs')).readdirSync(base)
      console.log('Looking for file...')
    } catch {}
    console.error('❌ Could not find gymai-exercises.md')
    console.error('   Put the file at: Love Ai gym fitness/scripts/gymai-exercises.md')
    process.exit(1)
  }

  const exercises = parseMd(mdContent)
  console.log(`✅ Parsed ${exercises.length} exercises\n`)

  // Test connection first
  console.log('🔌 Testing connection...')
  const { data: testData, error: testError } = await supabase.from('exercises').select('id').limit(1)
  if (testError) { console.error('❌ Connection failed:', testError.message); process.exit(1) }
  console.log('✅ Connected\n')

  // Delete existing
  console.log('🗑️  Clearing existing exercises...')
  const { error: delError } = await supabase.from('exercises').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delError) console.error('⚠️  Delete error:', delError.message)

  // Verify delete
  const { count: countAfterDel } = await supabase.from('exercises').select('*', { count: 'exact', head: true })
  console.log(`   Rows after delete: ${countAfterDel}`)

  console.log(`🔄 Importing ${exercises.length} exercises...\n`)

  let imported = 0
  let errors = 0
  const BATCH = 100

  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH)
    const { data: insertedData, error } = await supabase.from('exercises').insert(batch).select('id')
    if (error) {
      errors += batch.length
      console.error(`\n  ⚠️  Batch ${i}: ${error.message}`)
    } else {
      imported += (insertedData?.length || 0)
    }
    process.stdout.write(`\r  Importerat: ${imported} / ${exercises.length}`)
  }

  // Verify final count
  const { count: finalCount } = await supabase.from('exercises').select('*', { count: 'exact', head: true })
  console.log(`\n\n✅ Klar! ${imported} importerade, ${errors} fel. DB count: ${finalCount}`)
}

main().catch(console.error)
