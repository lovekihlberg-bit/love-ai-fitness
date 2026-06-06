API import routes — Direct-from-Storage flow

Architecture: Client → Supabase Storage → Import API → Validation → Database → AI Coach

Endpoints:
- POST /api/import/health
  - Accepts JSON: { profile_id, storage_key, source_filename }
  - Fetches file from Supabase Storage bucket `health-imports`
  - Validates, streams to `health_metrics`, inserts validation report
  - Returns 200 {status: 'PASS', summary, import_id} or 400 {status: 'FAIL', summary}

- POST /api/import/exercises
  - Accepts JSON: { storage_key, source_filename }
  - Fetches file from Supabase Storage bucket `exercise-imports`
  - Validates (duplicates, required fields, count threshold >= 1500)
  - Upserts into `exercises`, inserts validation report
  - Returns 200 {status: 'PASS', summary} or 400 {status: 'FAIL', summary}

Client-side flow:

```javascript
import { uploadHealthFile, uploadExercisesFile } from '@/lib/importHelper';

// Health import
const healthFile = document.getElementById('health-file').files[0];
const result = await uploadHealthFile(healthFile, profileId);
if (result.status === 'PASS') {
  console.log('Import successful:', result.import_id);
  // Validated data now available to AI Coach
}

// Exercises import
const exercisesFile = document.getElementById('exercises-file').files[0];
const result = await uploadExercisesFile(exercisesFile);
if (result.status === 'PASS') {
  console.log('Exercises imported:', result.summary);
}
```

Supabase Storage buckets (create in Supabase dashboard):
- `health-imports` — private, authenticated users upload their own health exports
- `exercise-imports` — private, authenticated users upload exercises JSON
- `exercises-media` — public read, authenticated upload (used by seed scripts)

Validation:
- Every import is validated before commit
- Validation reports saved in `validation_reports` table
- Staging rows marked `pending | failed | committed`
- Only PASSED imports make data available to AI Coach

Data flow:
1. File stored in Supabase Storage (immutable)
2. API creates staging row with `pending` status
3. File fetched from Storage, parsed, validated
4. Validation report created
5. On PASS: data upserted into production tables, staging marked `committed`
6. On FAIL: staging marked `failed`, data not committed
7. AI Coach queries production tables (exercises, health_metrics, etc.) via RLS policies

Notes:
- Large files (100+ MB) are stored in Supabase Storage, not sent through API
- All data validated before permanent storage
- Validation reports accessible for debugging and UI feedback
- Temporary files cleaned up after processing

