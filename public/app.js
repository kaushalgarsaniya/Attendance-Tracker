// =====================================================
// AUTH GUARD — redirect to login if not logged in
// =====================================================
const teacherRaw = sessionStorage.getItem('teacher');
if (!teacherRaw) {
  window.location.href = 'index.html';
}
const teacher = JSON.parse(teacherRaw);
document.getElementById('teacherName').textContent = `👤 ${teacher.username}`;

// =====================================================
// LOGOUT
// =====================================================
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('teacher');
  window.location.href = 'index.html';
});

// =====================================================
// TAB SWITCHING
// =====================================================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

let currentClassId = null;
let currentClassName = null;

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    // Prevent access to contextual tabs if no class is selected
    if ((target === 'students' || target === 'attendance' || target === 'report') && !currentClassId) {
      alert('Please select a class first.');
      return;
    }

    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`pane-${target}`).classList.add('active');

    if (target === 'classes') loadClassesList();
    if (target === 'students') loadStudentsList();
    if (target === 'attendance') initAttendanceTab();
    if (target === 'report') loadReport();
  });
});

// =====================================================
// HELPERS
// =====================================================
function showMsg(el, text, type) {
  // We use a global toast system now, 'el' is ignored but kept for signature compatibility
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success'
    ? `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `${icon} <span>${text}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) translateX(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getInitial(name) {
  return name.trim().charAt(0).toUpperCase();
}

function escHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, function (m) { return map[m]; });
}

// =====================================================
// TAB 0 — CLASSES
// =====================================================
let classesCache = [];

async function loadClassesList() {
  try {
    const res = await fetch(`/api/classes?teacher_id=${teacher.id}`);
    classesCache = await res.json();
    renderClassesList(classesCache);
  } catch (e) {
    console.error('Failed to load classes', e);
  }
}

function renderClassesList(classes) {
  const list = document.getElementById('classesList');
  const count = document.getElementById('classesCount');
  count.textContent = classes.length;

  if (classes.length === 0) {
    list.innerHTML = '<p class="empty-state">No classes created yet.</p>';
    return;
  }

  list.innerHTML = classes.map(c => `
    <div class="class-card" onclick="window.selectClass(${c.id}, '${escHtml(c.name)}')">
      <h3>${escHtml(c.name)}</h3>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="color:var(--text-dim);">→</span>
        <button type="button" class="btn btn-danger-outline" onclick="event.stopPropagation(); window.deleteClass(${c.id})" style="padding: 4px 8px; font-size: 0.75rem;">Delete</button>
      </div>
    </div>
  `).join('');
}

window.selectClass = function (id, name) {
  currentClassId = id;
  currentClassName = name;
  document.getElementById('classContextNav').classList.remove('hidden');
  document.getElementById('sidebarActiveClassName').textContent = name;
  document.getElementById('attendanceClassName').textContent = 'Class: ' + name;
  document.getElementById('tab-students').click();
};



window.deleteClass = async function (id) {
  try {
    const res = await fetch('/api/classes/' + id, { method: 'DELETE' });
    if (res.ok) {
      if (currentClassId === id) {
        currentClassId = null;
        document.getElementById('classContextNav').classList.add('hidden');
        document.getElementById('sidebarActiveClassName').textContent = 'None';
      }
      loadClassesList();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Server error: ' + err.message);
  }
};

document.getElementById('createClassForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('classNameInput');
  const name = input.value.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, teacher_id: teacher.id })
    });
    if (res.ok) {
      input.value = '';
      showMsg(document.body, `✅ Class "${name}" created!`, 'success');
      loadClassesList();
    } else {
      showMsg(document.body, '❌ Failed to create class', 'error');
    }
  } catch (err) {
    showMsg(document.body, '❌ Server error', 'error');
  }
});

// =====================================================
// TAB 1 — ADD STUDENT
// =====================================================
let studentsCache = [];

async function loadStudentsList() {
  if (!currentClassId) return;
  try {
    const res = await fetch(`/api/students?class_id=${currentClassId}`);
    studentsCache = await res.json();
    renderStudentList(studentsCache);
  } catch {
    console.error('Failed to load students');
  }
}

function renderStudentList(students) {
  const list = document.getElementById('studentList');
  const count = document.getElementById('studentCount');
  count.textContent = students.length;

  if (students.length === 0) {
    list.innerHTML = '<p class="empty-state">No students added yet.</p>';
    return;
  }

  list.innerHTML = students.map(s => `
    <div class="student-item">
      <div class="student-info">
        <div class="avatar">${getInitial(s.name)}</div>
        <span class="student-name">${escHtml(s.name)}</span>
      </div>
      <button type="button" class="btn btn-danger-outline" onclick="window.deleteStudent(${s.id})" style="padding: 6px 12px; font-size: 0.8rem;">Delete</button>
    </div>
  `).join('');
}

window.deleteStudent = async function (id) {
  try {
    const res = await fetch('/api/students/' + id, { method: 'DELETE' });
    if (res.ok) {
      loadStudentsList();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Server error: ' + err.message);
  }
};

document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentClassId) return;

  const input = document.getElementById('studentName');
  const msgEl = document.getElementById('studentMsg');
  const name = input.value.trim();
  if (!name) return;

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, class_id: currentClassId })
    });
    const data = await res.json();
    if (res.ok) {
      showMsg(msgEl, `✅ "${name}" added successfully!`, 'success');
      input.value = '';
      loadStudentsList();
    } else {
      showMsg(msgEl, `❌ ${data.error}`, 'error');
    }
  } catch {
    showMsg(msgEl, '❌ Server error.', 'error');
  }
});

// =====================================================
// TAB 2 — MARK ATTENDANCE (Bulk per date)
// =====================================================
const attDateInput = document.getElementById('attDate');
const attGridWrap = document.getElementById('attGridWrap');
const attBody = document.getElementById('attBody');
const attEmptyMsg = document.getElementById('attEmptyMsg');
const attendanceMsg = document.getElementById('attendanceMsg');

// Set today's date as default
attDateInput.valueAsDate = new Date();

// When date changes (or on tab load), render the student grid
async function loadAttendanceGrid() {
  const date = attDateInput.value;
  if (!date) {
    attGridWrap.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch(`/api/students?class_id=${currentClassId}`);
    const students = await res.json();

    const date = attDateInput.value;
    const attRes = await fetch(`/api/attendance/date/${date}?class_id=${currentClassId}`);
    const existingRecords = await attRes.json();
    const statusMap = {};
    if (Array.isArray(existingRecords)) {
      existingRecords.forEach(r => statusMap[r.student_id] = r.status);
    }

    if (students.length === 0) {
      attGridWrap.classList.add('hidden');
      attEmptyMsg.classList.remove('hidden');
      return;
    }

    attEmptyMsg.classList.add('hidden');
    attGridWrap.classList.remove('hidden');

    attBody.innerHTML = students.map((s, i) => {
      const existingStatus = statusMap[s.id];
      const isPresent = existingStatus === 'present' ? 'checked' : '';
      const isAbsent = existingStatus === 'absent' ? 'checked' : '';
      const rowClass = existingStatus ? `att-row-${existingStatus}` : '';

      return `
      <tr id="att-row-${s.id}" data-student-id="${s.id}" class="${rowClass}">
        <td>${i + 1}</td>
        <td>
          <div class="student-info">
            <div class="avatar">${getInitial(s.name)}</div>
            <span class="student-name">${escHtml(s.name)}</span>
          </div>
        </td>
        <td class="text-center">
          <input type="radio" name="att-${s.id}" value="present"
                 class="att-radio att-present" id="present-${s.id}"
                 onchange="highlightRow(${s.id}, 'present')" ${isPresent}>
          <label for="present-${s.id}" class="att-label">Present</label>
        </td>
        <td class="text-center">
          <input type="radio" name="att-${s.id}" value="absent"
                 class="att-radio att-absent" id="absent-${s.id}"
                 onchange="highlightRow(${s.id}, 'absent')" ${isAbsent}>
          <label for="absent-${s.id}" class="att-label">Absent</label>
        </td>
      </tr>
      `;
    }).join('');

  } catch {
    attGridWrap.classList.add('hidden');
    console.error('Failed to load attendance grid');
  }
}

// Highlight row based on selection
function highlightRow(studentId, status) {
  const row = document.getElementById(`att-row-${studentId}`);
  row.classList.remove('att-row-present', 'att-row-absent');
  row.classList.add(`att-row-${status}`);
}
// Expose to inline onchange
window.highlightRow = highlightRow;

// Date change → reload grid
attDateInput.addEventListener('change', loadAttendanceGrid);

// Mark All Present / All Absent
document.getElementById('markAllPresent').addEventListener('click', () => {
  document.querySelectorAll('.att-radio.att-present').forEach(r => {
    r.checked = true;
    const sid = r.id.replace('present-', '');
    highlightRow(sid, 'present');
  });
});

document.getElementById('markAllAbsent').addEventListener('click', () => {
  document.querySelectorAll('.att-radio.att-absent').forEach(r => {
    r.checked = true;
    const sid = r.id.replace('absent-', '');
    highlightRow(sid, 'absent');
  });
});

// Submit bulk attendance
document.getElementById('submitAttendance').addEventListener('click', async () => {
  const date = attDateInput.value;
  if (!date) {
    showMsg(attendanceMsg, '❌ Please select a date.', 'error');
    return;
  }

  const rows = attBody.querySelectorAll('tr[data-student-id]');
  const records = [];
  let allMarked = true;

  rows.forEach(row => {
    const sid = parseInt(row.dataset.studentId);
    const selected = row.querySelector('input[type="radio"]:checked');
    if (!selected) {
      allMarked = false;
    } else {
      records.push({ student_id: sid, status: selected.value });
    }
  });

  if (!allMarked || records.length === 0) {
    showMsg(attendanceMsg, '❌ Please mark Present or Absent for every student.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, records })
    });
    const data = await res.json();
    if (res.ok) {
      showMsg(attendanceMsg, `✅ Attendance saved for ${data.count} students on ${date}!`, 'success');
    } else {
      showMsg(attendanceMsg, `❌ ${data.error}`, 'error');
    }
  } catch {
    showMsg(attendanceMsg, '❌ Server error.', 'error');
  }
});

// Load grid when tab opens (triggered by tab switching)
function initAttendanceTab() {
  loadAttendanceGrid();
}

// =====================================================
// TAB 3 — REPORT
// =====================================================
async function loadReport() {
  const tbody = document.getElementById('reportBody');
  const summaryRow = document.getElementById('summaryRow');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading…</td></tr>';
  summaryRow.innerHTML = '';

  try {
    if (!currentClassId) return;
    const res = await fetch(`/api/report?class_id=${currentClassId}`);
    const rows = await res.json();

    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No data. Add students and mark attendance first.</td></tr>';
      return;
    }

    // Summary stats
    const totalStudents = rows.length;
    const safeCount = rows.filter(r => r.defaulter_status === 'Safe').length;
    const defaulterCount = rows.filter(r => r.defaulter_status === 'Defaulter').length;

    summaryRow.innerHTML = `
      <div class="stat-card primary">
        <div class="stat-value">${totalStudents}</div>
        <div class="stat-label">Total Students</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${safeCount}</div>
        <div class="stat-label">Safe</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-value">${defaulterCount}</div>
        <div class="stat-label">Defaulters</div>
      </div>
    `;

    // Table rows
    tbody.innerHTML = rows.map((r, i) => {
      const pct = r.percentage ?? 0;
      const isDefaulter = r.defaulter_status === 'Defaulter';
      const barColor = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

      return `
        <tr>
          <td>${i + 1}</td>
          <td><span class="student-name">${escHtml(r.name)}</span></td>
          <td>${r.total_classes ?? 0}</td>
          <td>${r.present_count ?? 0}</td>
          <td>
            <div style="display:flex; align-items:center; gap: 8px;">
              <div style="flex: 1; height: 6px; background: var(--bg-surface-hover); border-radius: 4px; overflow: hidden; min-width: 60px;">
                <div style="width:${Math.min(pct, 100)}%; height: 100%; background:${barColor}; border-radius: 4px;"></div>
              </div>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${pct}%</span>
            </div>
          </td>
          <td>
            <span class="pill ${isDefaulter ? 'pill-danger' : 'pill-success'}">
              ${isDefaulter ? 'Defaulter' : 'Safe'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

  } catch {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">❌ Failed to load report.</td></tr>';
  }
}

document.getElementById('refreshReport').addEventListener('click', loadReport);



// =====================================================
// INIT
// =====================================================
loadClassesList();
