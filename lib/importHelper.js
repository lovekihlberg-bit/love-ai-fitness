// Client-side helper: Upload file to Supabase Storage and trigger import API
// Usage: import { uploadHealthFile, uploadExercisesFile } from '@/lib/importHelper'

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Upload a health file (JSON or CSV) to Supabase Storage and trigger import API.
 * @param {File} file - The health file to upload
 * @param {string} profileId - User's profile UUID
 * @param {Function} onProgress - Optional callback: (progressEvent) => console.log(progressEvent.loaded, progressEvent.total)
 * @returns {Promise<{status: 'PASS'|'FAIL', summary: {...}, import_id: string}>}
 */
export async function uploadHealthFile(file, profileId, onProgress) {
  if (!profileId) throw new Error('profileId is required');
  if (!file) throw new Error('file is required');

  // Generate unique storage path
  const timestamp = Date.now();
  const storagePath = `${profileId}/${timestamp}_${file.name}`;

  try {
    // Step 1: Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('health-imports')
      .upload(storagePath, file, {
        cacheControl: '0',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Step 2: Call import API with storage key
    const response = await fetch(`${API_BASE}/import/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_id: profileId,
        storage_key: storagePath,
        source_filename: file.name
      })
    });

    if (!response.ok) {
      throw new Error(`Import API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Health file upload failed:', err);
    throw err;
  }
}

/**
 * Upload an exercises file (JSON array) to Supabase Storage and trigger import API.
 * @param {File} file - The exercises JSON file to upload
 * @param {Function} onProgress - Optional callback
 * @returns {Promise<{status: 'PASS'|'FAIL', summary: {...}}>}
 */
export async function uploadExercisesFile(file, onProgress) {
  if (!file) throw new Error('file is required');

  const timestamp = Date.now();
  const storagePath = `exercises/${timestamp}_${file.name}`;

  try {
    // Step 1: Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('exercise-imports')
      .upload(storagePath, file, {
        cacheControl: '0',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Step 2: Call import API with storage key
    const response = await fetch(`${API_BASE}/import/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_key: storagePath,
        source_filename: file.name
      })
    });

    if (!response.ok) {
      throw new Error(`Import API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Exercises file upload failed:', err);
    throw err;
  }
}

/**
 * Monitor import status via validation_reports table (optional, for UI polling).
 * @param {string} stagingId - The staging import ID from upload response
 * @returns {Promise<{status, summary, created_at}>}
 */
export async function checkImportStatus(stagingId) {
  const { data, error } = await supabase
    .from('validation_reports')
    .select('status, summary, created_at')
    .eq('import_id', stagingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}
