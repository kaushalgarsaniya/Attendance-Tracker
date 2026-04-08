-- Run this in your Supabase SQL Editor to bypass the safety locks and wipe everything.
TRUNCATE TABLE attendance, classes, students, teachers RESTART IDENTITY CASCADE;

-- Re-insert a single default teacher if you want to skip signing up again:
-- INSERT INTO teachers (username, password) VALUES ('teacher1', 'pass123');
