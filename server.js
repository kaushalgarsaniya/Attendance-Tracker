const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// AUTH ROUTES
// =====================================================

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const { data, error } = await supabase
    .from('teachers')
    .select('id, username')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  res.json({ success: true, teacher: { id: data.id, username: data.username } });
});

// POST /api/signup
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Try to insert teacher (username has a UNIQUE constraint in DB anyway, but let's handle gracefully)
  const { data, error } = await supabase
    .from('teachers')
    .insert({ username, password })
    .select('id, username')
    .single();

  if (error) {
    // Unique constraint violation (23505) or others
    return res.status(400).json({ error: error.message.includes('duplicate key') ? 'Username already taken.' : error.message });
  }

  res.json({ success: true, teacher: data });
});

// =====================================================
// CLASS ROUTES
// =====================================================

// GET /api/classes
app.get('/api/classes', async (req, res) => {
  const { teacher_id } = req.query;
  if (!teacher_id) {
    return res.status(400).json({ error: 'teacher_id is required.' });
  }
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', teacher_id)
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/classes
app.post('/api/classes', async (req, res) => {
  const { name, teacher_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Class name is required.' });
  const { data, error } = await supabase
    .from('classes')
    .insert({ name: name.trim(), teacher_id: teacher_id || null })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, class: data });
});

// DELETE /api/classes/:id
app.delete('/api/classes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid class ID.' });

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

// =====================================================
// STUDENT ROUTES
// =====================================================

// GET /api/students
app.get('/api/students', async (req, res) => {
  const { class_id } = req.query;
  if (!class_id) {
    return res.status(400).json({ error: 'class_id is required.' });
  }
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', class_id)
    .order('name', { ascending: true });
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// POST /api/students
app.post('/api/students', async (req, res) => {
  const { name, class_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Student name is required.' });
  }
  if (!class_id) {
    return res.status(400).json({ error: 'Class ID is required.' });
  }

  const { data, error } = await supabase
    .from('students')
    .insert({ name: name.trim(), class_id })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, id: data.id, name: data.name, class_id: data.class_id });
});

// DELETE /api/students/:id
app.delete('/api/students/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid student ID.' });
  }

  // First delete attendance records for this student
  const { error: attErr } = await supabase
    .from('attendance')
    .delete()
    .eq('student_id', id);

  if (attErr) {
    console.error('Delete attendance error:', attErr);
    return res.status(500).json({ error: attErr.message });
  }

  // Then delete the student
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({ error: error.message });
  }

  console.log(`Deleted student id=${id}`);
  res.json({ success: true });
});

// =====================================================
// ATTENDANCE ROUTES
// =====================================================

// POST /api/attendance
app.post('/api/attendance', async (req, res) => {
  const { student_id, date, status } = req.body;
  if (!student_id || !date || !status) {
    return res.status(400).json({ error: 'student_id, date, and status are required.' });
  }
  if (!['present', 'absent'].includes(status)) {
    return res.status(400).json({ error: 'status must be "present" or "absent".' });
  }

  // Check student exists
  const { data: student, error: studentErr } = await supabase
    .from('students')
    .select('id')
    .eq('id', student_id)
    .single();

  if (studentErr || !student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({ student_id, date, status })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, id: data.id });
});

// GET /api/attendance/date/:date — get all attendance records for a specific date
app.get('/api/attendance/date/:date', async (req, res) => {
  const { date } = req.params;
  const { class_id } = req.query;
  
  let selectStr = 'student_id, status';
  if (class_id) {
    selectStr += ', students!inner(class_id)';
  }
  
  let query = supabase.from('attendance').select(selectStr).eq('date', date);
  if (class_id) {
    query = query.eq('students.class_id', class_id);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// POST /api/attendance/bulk — mark attendance for ALL students on a given date
app.post('/api/attendance/bulk', async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'date and records[] are required.' });
  }

  // Validate all records
  for (const r of records) {
    if (!r.student_id || !['present', 'absent'].includes(r.status)) {
      return res.status(400).json({ error: `Invalid record for student_id=${r.student_id}.` });
    }
  }

  // Step 1: Delete existing attendance for these students on this date
  const studentIds = records.map(r => r.student_id);

  const { error: delError } = await supabase
    .from('attendance')
    .delete()
    .in('student_id', studentIds)
    .eq('date', date);

  if (delError) {
    return res.status(500).json({ error: delError.message });
  }

  // Step 2: Insert fresh records
  const rows = records.map(r => ({
    student_id: r.student_id,
    date,
    status: r.status
  }));

  const { error: insError } = await supabase
    .from('attendance')
    .insert(rows);

  if (insError) {
    return res.status(500).json({ error: insError.message });
  }

  res.json({ success: true, count: records.length });
});

// =====================================================
// REPORT ROUTE
// =====================================================

// GET /api/report
app.get('/api/report', async (req, res) => {
  const { class_id } = req.query;
  if (!class_id) {
    return res.status(400).json({ error: 'class_id is required.' });
  }

  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('id, name')
    .eq('class_id', class_id)
    .order('name', { ascending: true });

  if (sErr) {
    return res.status(500).json({ error: sErr.message });
  }

  const studentIds = students.map(s => s.id);

  let attendanceQuery = supabase.from('attendance').select('student_id, status');
  if (studentIds.length > 0) {
    attendanceQuery = attendanceQuery.in('student_id', studentIds);
  } else {
    // No students, no attendance
    return res.json([]);
  }

  const { data: attendance, error: aErr } = await attendanceQuery;

  if (aErr) {
    return res.status(500).json({ error: aErr.message });
  }

  // Build report
  const report = students.map(s => {
    const records = attendance.filter(a => a.student_id === s.id);
    const total_classes = records.length;
    const present_count = records.filter(a => a.status === 'present').length;
    const percentage = total_classes > 0
      ? Math.round((present_count / total_classes) * 10000) / 100
      : 0;
    const defaulter_status = total_classes === 0 ? 'Safe' : (percentage < 75 ? 'Defaulter' : 'Safe');

    return {
      id: s.id,
      name: s.name,
      total_classes,
      present_count,
      percentage,
      defaulter_status
    };
  });

  res.json(report);
});

// =====================================================
// START SERVER
// =====================================================
app.listen(PORT, () => {
  console.log(`\n✅ Smart Attendance Tracker running at http://localhost:${PORT}`);
  console.log(`   Database: Supabase (cloud PostgreSQL)`);
  console.log(`   Sign up or log in at http://localhost:${PORT}\n`);
});
