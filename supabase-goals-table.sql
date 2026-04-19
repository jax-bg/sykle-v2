-- Supabase goal table schema aligned with log categories and types

-- Add category/subtype columns to existing Goals table if needed.
ALTER TABLE IF EXISTS public."Goals"
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'water',
  ADD COLUMN IF NOT EXISTS subtype text NOT NULL DEFAULT 'shower',
  ADD COLUMN IF NOT EXISTS current_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Make sure the table has a primary key and user reference.
ALTER TABLE IF EXISTS public."Goals"
  ADD COLUMN IF NOT EXISTS id uuid PRIMARY KEY DEFAULT gen_random_uuid();

-- Ensure RLS is enabled and policies allow authenticated users to manage their own records.
ALTER TABLE IF EXISTS public."Goals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Goals allow authenticated user read" ON public."Goals"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Goals allow authenticated user insert" ON public."Goals"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Goals allow authenticated user update" ON public."Goals"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Goals allow authenticated user delete" ON public."Goals"
  FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: keep updated_at in sync.
CREATE OR REPLACE FUNCTION public.updated_at_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public."Goals";
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public."Goals"
  FOR EACH ROW EXECUTE FUNCTION public.updated_at_trigger();
