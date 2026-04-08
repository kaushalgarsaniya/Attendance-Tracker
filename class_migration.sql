-- 1. Create the classes table
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on classes
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Policy to allow full access to classes
DROP POLICY IF EXISTS "Allow all on classes" ON classes;
CREATE POLICY "Allow all on classes" ON classes FOR ALL USING (true) WITH CHECK (true);

-- 2. Add class_id to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE;

-- If there are any existing students, we might want to group them into a "Legacy" class,
-- but for simplicity we will just let them have class_id = NULL for now
-- or we can create a default class if you prefer.
-- For standardizing, let's leave existing students alone, but new ones will require it in API.
