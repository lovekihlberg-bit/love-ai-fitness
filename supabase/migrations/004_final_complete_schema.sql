-- LOVE AI FITNESS — Complete Supabase Database Schema
-- Final migration: combines all tables, indexes, RLS policies, and storage configuration

-- ============ Extensions ============
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ Auth Setup (Reference) ============
-- Note: Use Supabase Auth UI to create profiles and link auth.users.id to profiles.user_id

-- ============ Profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  preferred_name text,
  birth_date date,
  sex text,
  height_cm numeric,
  timezone text DEFAULT 'UTC',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- ============ Exercises ============
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL UNIQUE,
  instructions_en text,
  instructions_sv text,
  primary_muscles text[],
  secondary_muscles text[],
  equipment text[],
  category text,
  difficulty text,
  images text[],
  videos text[],
  alternatives uuid[],
  similar_exercises uuid[],
  tags text[],
  embedding vector(1536),
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exercises_name_trgm_idx ON exercises USING gin (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises(category);
CREATE INDEX IF NOT EXISTS exercises_tags_idx ON exercises USING gin (tags);
CREATE INDEX IF NOT EXISTS exercises_embedding_idx ON exercises USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS exercises_search_vector_idx ON exercises USING gin (search_vector);

CREATE FUNCTION exercises_search_vector_trigger() RETURNS trigger AS $$
begin
  new.search_vector := to_tsvector('english', coalesce(new.name_en, '')) || to_tsvector('simple', coalesce(array_to_string(new.tags, ' '), ''));
  return new;
end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exercises_search_vector_update ON exercises;
CREATE TRIGGER exercises_search_vector_update BEFORE INSERT OR UPDATE
ON exercises FOR EACH ROW EXECUTE FUNCTION exercises_search_vector_trigger();

-- ============ Workout Templates ============
CREATE TABLE IF NOT EXISTS workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name_sv text NOT NULL,
  description_sv text,
  split_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_templates_profile_idx ON workout_templates(profile_id);

-- ============ Workout Sessions ============
CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id uuid REFERENCES workout_templates(id) ON DELETE SET NULL,
  session_date timestamptz NOT NULL,
  duration_seconds int,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_sessions_profile_date_idx ON workout_sessions(profile_id, session_date DESC);

-- ============ Workout Exercises ============
CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  order_index int DEFAULT 0,
  notes text
);

CREATE INDEX IF NOT EXISTS workout_exercises_session_idx ON workout_exercises(session_id, order_index);
CREATE INDEX IF NOT EXISTS workout_exercises_exercise_idx ON workout_exercises(exercise_id);

-- ============ Exercise Sets ============
CREATE TABLE IF NOT EXISTS exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  weight numeric,
  reps int,
  duration_seconds int,
  distance_m numeric,
  rest_seconds int,
  rpe int,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exercise_sets_workout_exercise_idx ON exercise_sets(workout_exercise_id);

-- ============ Personal Records ============
CREATE TABLE IF NOT EXISTS personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  metric text,
  value numeric,
  unit text,
  achieved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_records_profile_exercise_idx ON personal_records(profile_id, exercise_id);

-- ============ Goals ============
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_sv text NOT NULL,
  description_sv text,
  metric text,
  target_value numeric,
  deadline date,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goals_profile_idx ON goals(profile_id);

-- ============ Health Imports (staging and final) ============
CREATE TABLE IF NOT EXISTS health_imports_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid,
  source_filename text,
  source_type text,
  raw_payload jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_imports_staging_profile_idx ON health_imports_staging(profile_id);

CREATE TABLE IF NOT EXISTS health_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_filename text,
  source_type text,
  raw_payload jsonb,
  imported_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_imports_profile_idx ON health_imports(profile_id, imported_at DESC);

-- ============ Generic Health Metrics ============
CREATE TABLE IF NOT EXISTS health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_key text NOT NULL,
  value numeric,
  value_json jsonb,
  unit text,
  timestamp timestamptz,
  source_import_id uuid REFERENCES health_imports(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_metrics_profile_metric_ts_idx ON health_metrics(profile_id, metric_key, timestamp DESC);
CREATE INDEX IF NOT EXISTS health_metrics_timestamp_idx ON health_metrics(timestamp DESC);

-- ============ Sleep Data ============
CREATE TABLE IF NOT EXISTS sleep_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes int,
  stages jsonb,
  source_import_id uuid REFERENCES health_imports(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sleep_data_profile_idx ON sleep_data(profile_id, start_time DESC);

-- ============ Heart Rate Data ============
CREATE TABLE IF NOT EXISTS heart_rate_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp timestamptz,
  heart_rate int,
  source text,
  source_import_id uuid REFERENCES health_imports(id)
);

CREATE INDEX IF NOT EXISTS heart_rate_data_profile_ts_idx ON heart_rate_data(profile_id, timestamp DESC);

-- ============ HRV Data ============
CREATE TABLE IF NOT EXISTS hrv_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp timestamptz,
  hrv_ms numeric,
  source_import_id uuid REFERENCES health_imports(id)
);

CREATE INDEX IF NOT EXISTS hrv_data_profile_ts_idx ON hrv_data(profile_id, timestamp DESC);

-- ============ VO2 Max Data ============
CREATE TABLE IF NOT EXISTS vo2max_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp timestamptz,
  vo2_value numeric,
  source_import_id uuid REFERENCES health_imports(id)
);

CREATE INDEX IF NOT EXISTS vo2max_profile_ts_idx ON vo2max_data(profile_id, timestamp DESC);

-- ============ Bodyweight Data ============
CREATE TABLE IF NOT EXISTS bodyweight_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp timestamptz,
  weight_kg numeric,
  bmi numeric,
  source_import_id uuid REFERENCES health_imports(id)
);

CREATE INDEX IF NOT EXISTS bodyweight_profile_ts_idx ON bodyweight_data(profile_id, timestamp DESC);

-- ============ Recovery Data ============
CREATE TABLE IF NOT EXISTS recovery_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date,
  recovery_score numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recovery_profile_date_idx ON recovery_data(profile_id, date DESC);

-- ============ AI Conversations ============
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_system text,
  messages jsonb,
  summary text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_conversations_profile_idx ON ai_conversations(profile_id, created_at DESC);

-- ============ Analytics Data ============
CREATE TABLE IF NOT EXISTS analytics_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key text,
  value jsonb,
  computed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_profile_key_idx ON analytics_data(profile_id, key, computed_at DESC);

-- ============ Staging and Validation ============
CREATE TABLE IF NOT EXISTS exercises_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  raw jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS validation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type text NOT NULL,
  import_id uuid,
  profile_id uuid,
  status text,
  summary jsonb,
  errors jsonb,
  warnings jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS validation_reports_import_idx ON validation_reports(import_type, import_id);
CREATE INDEX IF NOT EXISTS validation_reports_profile_idx ON validation_reports(profile_id, created_at DESC);

-- ============ Materialized Views for Search ============
DROP MATERIALIZED VIEW IF EXISTS exercises_search CASCADE;
CREATE MATERIALIZED VIEW exercises_search AS
SELECT id, name_en, array_to_string(tags, ' ') AS tags_text, to_tsvector('english', coalesce(name_en, '')) AS document
FROM exercises;
CREATE INDEX exercises_search_document_idx ON exercises_search USING gin (document);

-- ============ Row Level Security ============
-- Enable RLS on all user-owned tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_rate_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE vo2max_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodyweight_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update own
CREATE POLICY "Profiles: users read own" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Profiles: users update own" ON profiles FOR UPDATE USING (user_id = auth.uid());

-- Workout data: users can read/write own via profile_id
CREATE POLICY "Workout templates: read own" ON workout_templates FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Workout templates: insert own" ON workout_templates FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Workout templates: update own" ON workout_templates FOR UPDATE USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Workout sessions: read own" ON workout_sessions FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Workout sessions: insert own" ON workout_sessions FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Workout sessions: update own" ON workout_sessions FOR UPDATE USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Workout exercises: read own" ON workout_exercises FOR SELECT USING (session_id IN (SELECT id FROM workout_sessions WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Workout exercises: insert own" ON workout_exercises FOR INSERT WITH CHECK (session_id IN (SELECT id FROM workout_sessions WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));
CREATE POLICY "Workout exercises: update own" ON workout_exercises FOR UPDATE USING (session_id IN (SELECT id FROM workout_sessions WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Exercise sets: read own" ON exercise_sets FOR SELECT USING (workout_exercise_id IN (SELECT id FROM workout_exercises WHERE session_id IN (SELECT id FROM workout_sessions WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))));
CREATE POLICY "Exercise sets: insert own" ON exercise_sets FOR INSERT WITH CHECK (workout_exercise_id IN (SELECT id FROM workout_exercises WHERE session_id IN (SELECT id FROM workout_sessions WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))));
CREATE POLICY "Exercise sets: update own" ON exercise_sets FOR UPDATE USING (workout_exercise_id IN (SELECT id FROM workout_exercises WHERE session_id IN (SELECT id FROM workout_sessions WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))));

-- Health data: users can read/write own
CREATE POLICY "Health metrics: read own" ON health_metrics FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Health metrics: insert own" ON health_metrics FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Sleep data: read own" ON sleep_data FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Heart rate: read own" ON heart_rate_data FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "HRV: read own" ON hrv_data FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "VO2Max: read own" ON vo2max_data FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Bodyweight: read own" ON bodyweight_data FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- AI & Analytics: read own
CREATE POLICY "AI conversations: read own" ON ai_conversations FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "AI conversations: insert own" ON ai_conversations FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Analytics: read own" ON analytics_data FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Exercises: public read
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY; -- or set public read if RLS enabled
-- (exercises table has public read access, no profile filtering needed)

-- ============ Supabase Storage Configuration ============
-- Note: Configure these in Supabase dashboard > Storage
-- Bucket 1: health-imports (private, authenticated upload)
-- Bucket 2: exercise-imports (private, authenticated upload)
-- Bucket 3: exercises-media (public read, authenticated upload)

-- End of migration
