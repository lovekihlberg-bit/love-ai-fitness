# LOVE AI FITNESS — Setup & Deployment Guide

## Architecture Overview

**Direct-from-Storage Import Flow**
- Client uploads files directly to Supabase Storage
- Client sends storage key to Import API
- API fetches from Storage, validates, saves to Supabase
- Validation reports available immediately
- Validated data available to AI Coach via RLS

**Data Flow**
```
Client → Supabase Storage (immutable) → Import API → Validation Pipeline → 
Production Tables (exercises, health_metrics, etc.) → AI Coach (via RLS)
```

## Prerequisites

- Supabase account (free or paid)
- Vercel account (for hosting Next.js app)
- Node.js 18+ (for seed scripts)
- Environment variables configured

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your `.env.local`
3. Also save `SUPABASE_SERVICE_ROLE_KEY` for server-side operations

## Step 2: Run Database Migrations

Execute the following SQL migrations in Supabase SQL Editor:

### Migration 1: Initial schema
Copy contents of `/supabase/migrations/001_init.sql` and run in Supabase SQL Editor

### Migration 2: Add pgvector
Copy contents of `/supabase/migrations/002_add_pgvector.sql`

### Migration 3: Validation & staging
Copy contents of `/supabase/migrations/003_validation_and_staging.sql`

### Migration 4: Final complete schema (recommended)
Copy contents of `/supabase/migrations/004_final_complete_schema.sql` — This combines all tables, RLS, and indexes in one file.

## Step 3: Create Supabase Storage Buckets

In Supabase dashboard, go to Storage and create three buckets:

1. **health-imports**
   - Visibility: Private
   - Policies: Allow authenticated users to upload to their own profile path (`${uid}/...`)

2. **exercise-imports**
   - Visibility: Private
   - Policies: Allow authenticated users to upload

3. **exercises-media**
   - Visibility: Public
   - Policies: Allow authenticated users to upload

### Example RLS Policy for health-imports

```sql
-- Bucket: health-imports
CREATE POLICY "authenticated can upload own health" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'health-imports' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "authenticated can read own health" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'health-imports' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);
```

## Step 4: Deploy Next.js App

1. Set up Next.js project:
```bash
npm create next-app@latest love-ai-fitness
cd love-ai-fitness
npm install @supabase/supabase-js busboy csv-parse
```

2. Copy API routes from `/api/import/*.js` to `pages/api/import/`

3. Copy `/lib/importHelper.js` to your project's `lib/` folder

4. Deploy to Vercel:
```bash
npm install -g vercel
vercel --prod
```

5. Add environment variables in Vercel:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE=/api
```

## Step 5: Seed Exercise Database

1. Generate 1500+ exercises:
```bash
cd scripts/seed_exercises
npm install
node generate_seed_dataset.js --count=1500 --out=../../data/exercises_generated.json
```

2. Upload to Supabase via API:
```bash
node scripts/seed_exercises/seed_exercises.js --input=data/exercises_generated.json
```

Or use your app's UI to upload exercises.json to `/api/import/exercises`

## Step 6: Set Up Auth (Supabase Auth)

1. In Supabase dashboard, go to Authentication
2. Enable Email/Password or other providers
3. Create a user profile after signup by inserting into `profiles` table

Example trigger to create profile on signup:
```sql
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.email);
  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Usage

### Upload Health Data

```javascript
import { uploadHealthFile } from '@/lib/importHelper';

const file = document.getElementById('health-file').files[0];
const result = await uploadHealthFile(file, profileId);

if (result.status === 'PASS') {
  console.log('Health data imported:', result.import_id);
  // Data now available to AI Coach
} else {
  console.log('Validation failed:', result.summary);
}
```

### Upload Exercises

```javascript
import { uploadExercisesFile } from '@/lib/importHelper';

const file = document.getElementById('exercises-file').files[0];
const result = await uploadExercisesFile(file);

if (result.status === 'PASS') {
  console.log('Exercises imported successfully');
}
```

### Query Data in AI Coach

```sql
-- AI Coach queries (server-side, uses service role to bypass RLS for analysis)
SELECT * FROM health_metrics 
WHERE profile_id = $1 
AND timestamp >= now() - interval '6 months'
ORDER BY timestamp DESC;

SELECT * FROM personal_records 
WHERE profile_id = $1 
ORDER BY achieved_at DESC;

-- Client queries (RLS enforced, user can only see own data)
SELECT * FROM health_metrics 
WHERE profile_id = auth.uid();
```

## Validation & Monitoring

Check validation reports:
```sql
SELECT * FROM validation_reports 
WHERE profile_id = $1 
ORDER BY created_at DESC;
```

## Troubleshooting

**File upload fails:**
- Ensure bucket exists and is accessible
- Check RLS policies on bucket
- Verify storage_key format

**Validation fails:**
- Check `validation_reports` for details
- Review `errors` and `warnings` fields
- Ensure required fields present (name_en, category, primary_muscles for exercises)

**AI Coach can't access data:**
- Verify RLS policies allow AI (service role bypass or specific policy)
- Check that data was committed (status = 'PASS' in validation_reports)
- Ensure profile_id matches

## Next Steps

1. Implement UI components for upload, search, dashboard
2. Implement AI Coach conversation interface
3. Add analytics and reporting pages
4. Set up background jobs for daily/weekly reports
5. Add mobile support (React Native or PWA)

## Support

For issues with:
- Supabase: see [Supabase docs](https://supabase.com/docs)
- Next.js: see [Next.js docs](https://nextjs.org/docs)
- Data import: check validation_reports in Supabase dashboard
