-- =========================================================
-- Smart Attendance Tracker — Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =========================================================

-- 1. TEACHERS TABLE (Authentication)
CREATE TABLE IF NOT EXISTS teachers (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
  id         SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEX for faster attendance lookups
CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
  ON attendance(student_id, date);

-- 5. SEED DEFAULT TEACHER
INSERT INTO teachers (username, password) 
VALUES ('teacher1', 'pass123')
ON CONFLICT (username) DO NOTHING;

-- 6. ENABLE ROW LEVEL SECURITY (RLS) — disabled for MVP simplicity
-- You can enable RLS later for production use
ALTER TABLE teachers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE students  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES — allow all operations via service role / anon key
-- Teachers table: allow read for login
CREATE POLICY "Allow read teachers" ON teachers
  FOR SELECT USING (true);

-- Students table: allow all CRUD
CREATE POLICY "Allow all on students" ON students
  FOR ALL USING (true) WITH CHECK (true);

-- Attendance table: allow all CRUD
CREATE POLICY "Allow all on attendance" ON attendance
  FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- DONE! Your database is ready.
-- =========================================================
