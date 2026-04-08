/**
 * One-time Supabase database setup script.
 * Run: node setup_db.js
 *
 * This uses the Supabase REST SQL endpoint to create tables,
 * seed data, and set up RLS policies.
 */
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const SQL = `
-- 1. TEACHERS TABLE
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

-- 4. INDEX
CREATE INDEX IF NOT EXISTS idx_attendance_student_date
  ON attendance(student_id, date);

-- 5. SEED TEACHER
INSERT INTO teachers (username, password)
VALUES ('teacher1', 'pass123')
ON CONFLICT (username) DO NOTHING;

-- 6. RLS
ALTER TABLE teachers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE students  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 7. POLICIES (drop if exist to avoid duplicates, then create)
DROP POLICY IF EXISTS "Allow read teachers" ON teachers;
CREATE POLICY "Allow read teachers" ON teachers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all on students" ON students;
CREATE POLICY "Allow all on students" ON students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on attendance" ON attendance;
CREATE POLICY "Allow all on attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);

-- 8. Allow inserts on teachers for seeding via anon
DROP POLICY IF EXISTS "Allow insert teachers" ON teachers;
CREATE POLICY "Allow insert teachers" ON teachers FOR INSERT WITH CHECK (true);
`;

async function runSql() {
  console.log('🔧 Setting up Supabase database...\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ query: SQL })
  });

  // The REST rpc endpoint won't work for DDL, so we use the SQL endpoint instead
  // Supabase exposes a /rest/v1/ endpoint but not raw SQL via anon key.
  // We need to use the pg connection or the dashboard SQL editor.

  console.log('⚠️  The Supabase JS client and REST API cannot run DDL (CREATE TABLE) statements.');
  console.log('');
  console.log('👉 Please follow these steps:');
  console.log('');
  console.log('   1. Open your Supabase Dashboard:');
  console.log(`      ${SUPABASE_URL.replace('.supabase.co', '.supabase.co')}`);
  console.log('');
  console.log('   2. Go to: SQL Editor → New Query');
  console.log('');
  console.log('   3. Copy & paste the SQL below and click "Run":');
  console.log('');
  console.log('─'.repeat(60));
  console.log(SQL);
  console.log('─'.repeat(60));
  console.log('');
  console.log('   4. After running, come back here and start the server:');
  console.log('      node server.js');
  console.log('');
}

runSql();
