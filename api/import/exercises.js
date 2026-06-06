import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing SUPABASE env vars');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function downloadFromStorage(bucket, storagePath) {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) throw error;
  const buffer = await data.arrayBuffer();
  const tmpDir = os.tmpdir();
  const dest = path.join(tmpDir, `${Date.now()}_${path.basename(storagePath)}`);
  fs.writeFileSync(dest, Buffer.from(buffer));
  return dest;
}

async function validateExercisesPayload(exercises) {
  const result = { total: exercises.length, duplicates: [], missing_name: 0, missing_category: 0, missing_primary: 0, broken: 0 };
  const seen = new Set();
  for (const e of exercises) {
    const name = (e.name_en || '').trim();
    if (!name) { result.missing_name++; result.broken++; continue; }
    const key = name.toLowerCase();
    if (seen.has(key)) result.duplicates.push({ name, reason: 'duplicate_in_import' });
    seen.add(key);
    if (!e.category) result.missing_category++;
    if (!e.primary_muscles || !Array.isArray(e.primary_muscles) || e.primary_muscles.length===0) result.missing_primary++;
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { storage_key, source_filename } = req.body;
    if (!storage_key) return res.status(400).json({ error: 'Missing storage_key' });

    // Create staging row
    const { data: staging, error: stErr } = await supabase.from('exercises_staging').insert([{ source: source_filename || storage_key, raw: null, status: 'pending' }]).select('*');
    if (stErr) throw stErr;
    const stagingId = staging[0].id;

    // Download from storage
    let filePath;
    try {
      filePath = await downloadFromStorage('exercise-imports', storage_key);
    } catch (err) {
      await supabase.from('exercises_staging').update({ status: 'failed' }).eq('id', stagingId);
      return res.status(400).json({ error: 'Failed to download from storage: ' + err.message });
    }

    // Parse JSON
    const content = fs.readFileSync(filePath, 'utf8');
    let exercises = [];
    try {
      exercises = JSON.parse(content);
    } catch (e) {
      await supabase.from('exercises_staging').update({ status: 'failed' }).eq('id', stagingId);
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    if (!Array.isArray(exercises)) {
      await supabase.from('exercises_staging').update({ status: 'failed' }).eq('id', stagingId);
      return res.status(400).json({ error: 'Expected JSON array' });
    }

    // Validate
    const validation = await validateExercisesPayload(exercises);
    const { data: existing } = await supabase.from('exercises').select('id,name_en');
    const existingNames = new Set((existing||[]).map(e => (e.name_en||'').trim().toLowerCase()));
    const uniqueNew = [...new Set(exercises.map(e => (e.name_en||'').trim().toLowerCase()))].filter(n => n && !existingNames.has(n)).length;
    const totalAfter = (existing||[]).length + uniqueNew;
    validation.count_after = totalAfter;
    validation.count_threshold_pass = totalAfter >= 1500;

    const status = (validation.duplicates.length === 0 && validation.missing_name===0 && validation.missing_category===0 && validation.missing_primary===0 && validation.count_threshold_pass) ? 'PASS' : 'FAIL';

    await supabase.from('validation_reports').insert([{ import_type: 'exercises', import_id: stagingId, status, summary: validation, errors: validation.duplicates, warnings: [] }]);

    if (status === 'FAIL') {
      await supabase.from('exercises_staging').update({ status: 'failed' }).eq('id', stagingId);
      fs.unlinkSync(filePath);
      return res.status(400).json({ status: 'FAIL', summary: validation });
    }

    // Upsert
    const upsertRecords = exercises.map(e => ({ name_en: e.name_en, instructions_sv: e.instructions_sv || null, primary_muscles: e.primary_muscles || [], secondary_muscles: e.secondary_muscles || [], equipment: e.equipment || [], category: e.category || null, difficulty: e.difficulty || null, images: e.images || [], videos: e.videos || [], tags: e.tags || [], raw: e }));
    const batchSize = 100;
    for (let i=0;i<upsertRecords.length;i+=batchSize) {
      const batch = upsertRecords.slice(i,i+batchSize);
      const { error } = await supabase.from('exercises').upsert(batch, { onConflict: 'name_en' });
      if (error) throw error;
    }

    await supabase.from('exercises_staging').update({ status: 'committed' }).eq('id', stagingId);
    fs.unlinkSync(filePath);

    return res.status(200).json({ status: 'PASS', summary: validation });
  } catch (err) {
    console.error('Import exercises error', err.message);
    return res.status(500).json({ error: err.message });
  }
}
