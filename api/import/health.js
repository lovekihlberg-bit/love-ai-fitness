import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { parse as csvParse } from 'csv-parse';

// Serverless import handler for health files (JSON or CSV) fetched directly from Supabase Storage
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing SUPABASE env vars');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function detectFormatByFilename(filename = '') {
  const fn = filename.toLowerCase();
  if (fn.endsWith('.json')) return 'json';
  if (fn.endsWith('.csv')) return 'csv';
  return null;
}

async function downloadFromStorage(bucket, storagePath) {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) throw error;
  const buffer = await data.arrayBuffer();
  const tmpDir = os.tmpdir();
  const dest = path.join(tmpDir, `${Date.now()}_${path.basename(storagePath)}`);
  fs.writeFileSync(dest, Buffer.from(buffer));
  return dest;
}

async function processHealthFile(profile_id, source_filename, filePath, format, stagingId) {
  // Validate and stream-insert into health_metrics in batches. Returns validation summary and importId if committed.
  const validation = { total_records: 0, duplicates: 0, invalid_timestamps: 0, invalid_values: 0, missing_profile: false, corrupted: 0, errors: [] };

  // ensure profile exists
  if (profile_id) {
    const { data: prof } = await supabase.from('profiles').select('id').eq('id', profile_id).limit(1);
    if (!prof || prof.length === 0) validation.missing_profile = true;
  } else validation.missing_profile = true;

  // Helper to insert batch
  async function insertBatch(importId, batch) {
    if (batch.length === 0) return;
    const { error } = await supabase.from('health_metrics').insert(batch);
    if (error) console.warn('batch insert error', error.message);
  }

  // Create top-level import row in health_imports
  const { data: ins, error: insErr } = await supabase.from('health_imports').insert([{ profile_id, source_filename, source_type: format, raw_payload: null }]).select('*');
  if (insErr) throw insErr;
  const importId = ins[0].id;

  const batch = [];

  if (format === 'json') {
    const stat = fs.statSync(filePath);
    if (stat.size > 200 * 1024 * 1024) {
      // Very large file: attempt streaming parse is recommended; here we parse whole file if possible
    }
    const content = fs.readFileSync(filePath, 'utf8');
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (e) { validation.corrupted++; validation.errors.push('Invalid JSON'); }
    let records = [];
    if (parsed) {
      if (Array.isArray(parsed)) records = parsed;
      else if (parsed.Record && Array.isArray(parsed.Record)) records = parsed.Record;
      else {
        for (const k of Object.keys(parsed)) if (Array.isArray(parsed[k])) records.push(...parsed[k]);
      }
    }

    validation.total_records = records.length;
    const seen = new Set();
    for (const r of records) {
      const metric_key = (r.type || r.recordType || r.metric || 'unknown').toString();
      const timestamp = r.startDate || r.timestamp || r.date || r.sampleTime || null;
      const value = r.value ?? r.quantity ?? r.val ?? null;
      const key = `${metric_key}||${timestamp}||${JSON.stringify(value)};`;
      if (seen.has(key)) validation.duplicates++;
      seen.add(key);
      if (!timestamp || isNaN(new Date(timestamp).getTime())) validation.invalid_timestamps++;
      if (value === null || (typeof value === 'string' && value.trim()==='')) validation.invalid_values++;
      const row = { profile_id, metric_name: metric_key, metric_key, value: value !== null ? Number(value) : null, value_json: value === null ? r : null, unit: r.unit || null, timestamp, source_import_id: importId };
      batch.push(row);
      if (batch.length >= 500) { await insertBatch(importId, batch.splice(0)); }
    }
  } else if (format === 'csv') {
    const parser = fs.createReadStream(filePath).pipe(csvParse({ columns: true, skip_empty_lines: true }));
    for await (const r of parser) {
      validation.total_records++;
      const metric_key = (r.type || r.metric || r.recordType || 'unknown').toString();
      const timestamp = r.startDate || r.timestamp || r.date || r.sampleTime || r.datetime || null;
      const value = r.value ?? r.quantity ?? r.val ?? null;
      if (!timestamp || isNaN(new Date(timestamp).getTime())) validation.invalid_timestamps++;
      if (value === null || (typeof value === 'string' && value.trim()==='')) validation.invalid_values++;
      const row = { profile_id, metric_name: metric_key, metric_key, value: value !== null ? Number(value) : null, value_json: value === null ? r : null, unit: r.unit || null, timestamp, source_import_id: importId };
      batch.push(row);
      if (batch.length >= 500) { await insertBatch(importId, batch.splice(0)); }
    }
  }

  if (batch.length) await insertBatch(importId, batch.splice(0));

  const status = (validation.duplicates === 0 && validation.invalid_timestamps === 0 && validation.invalid_values === 0 && !validation.missing_profile) ? 'PASS' : 'FAIL';

  const report = { import_type: 'health', import_id: stagingId, profile_id, status, summary: validation, errors: [], warnings: [] };
  await supabase.from('validation_reports').insert(report);

  await supabase.from('health_imports_staging').update({ status: status === 'PASS' ? 'committed' : 'failed' }).eq('id', stagingId);

  return { validation, status, importId };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { profile_id, storage_key, source_filename } = req.body;
    if (!profile_id || !storage_key) return res.status(400).json({ error: 'Missing profile_id or storage_key' });

    const format = detectFormatByFilename(source_filename || storage_key) || 'json';
    
    // Create staging row
    const { data: staging, error: stErr } = await supabase.from('health_imports_staging').insert([{ profile_id, source_filename: source_filename || storage_key, source_type: format, raw_payload: null, status: 'pending' }]).select('*');
    if (stErr) throw stErr;
    const stagingId = staging[0].id;

    // Download from storage
    let filePath;
    try {
      filePath = await downloadFromStorage('health-imports', storage_key);
    } catch (err) {
      await supabase.from('health_imports_staging').update({ status: 'failed' }).eq('id', stagingId);
      return res.status(400).json({ error: 'Failed to download from storage: ' + err.message });
    }

    // Process
    const result = await processHealthFile(profile_id, source_filename || storage_key, filePath, format, stagingId);
    
    // Cleanup
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(result.status === 'PASS' ? 200 : 400).json({ status: result.status, summary: result.validation, import_id: result.importId });
  } catch (err) {
    console.error('Health import error', err.message);
    return res.status(500).json({ error: err.message });
  }
}
