-- Progress Photos table
CREATE TABLE IF NOT EXISTS progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  taken_at date NOT NULL,
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS progress_photos_profile_date_idx ON progress_photos(profile_id, taken_at DESC);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Progress photos: read own" ON progress_photos FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Progress photos: insert own" ON progress_photos FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Progress photos: delete own" ON progress_photos FOR DELETE USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Also add conversation_id column to ai_conversations if missing
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS conversation_id text;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS user_message text;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS assistant_message text;
