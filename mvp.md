# Smart Attendance Tracker — MVP (SQL Version)

## 1. Project Overview

A minimal system to record student attendance, store it in a relational database,
calculate attendance percentage dynamically, and identify defaulters.
Access is restricted to authenticated teachers via a simple login system.

---

## 2. Core Features

- Teacher login (id + password via SQL)
- Add students
- Mark attendance (Present / Absent)
- Store records in SQL database
- Calculate attendance percentage
- Highlight defaulters (<75%)

---

## 3. Database Design (SQL — normalized but simple)

### Table: teachers
| Column   | Type                        |
|----------|-----------------------------|
| id       | Primary Key, Auto Increment |
| username | VARCHAR                     |
| password | VARCHAR (plain text / MVP)  |

### Table: students
| Column | Type                        |
|--------|-----------------------------|
| id     | Primary Key, Auto Increment |
| name   | VARCHAR                     |

### Table: attendance
| Column     | Type                              |
|------------|-----------------------------------|
| id         | Primary Key, Auto Increment       |
| student_id | Foreign Key → students.id         |
| date       | DATE                              |
| status     | ENUM: 'present', 'absent'         |

---

## 4. Relationships

- One teacher → manages all students and attendance
- One student → many attendance records
- Linked via student_id

---

## 5. System Behavior

- Teacher must log in before accessing any feature
- Each attendance entry is a row in attendance table
- No data duplication
- Percentage is calculated using SQL queries
- Defaulter status is derived at runtime

---

## 6. Functional Flow

1. Teacher logs in → validate against `teachers` table
2. If valid → grant access to dashboard
3. Insert student into `students`
4. Insert attendance record into `attendance`
5. Fetch all attendance data per student
6. Calculate:
   - Total classes = COUNT(*)
   - Present = COUNT(status = 'present')
   - Compute percentage
   - Flag if < 75%

---

## 7. SQL Logic (Core Concepts)

### Authentication Query
```sql
SELECT id, username FROM teachers
WHERE username = ? AND password = ?;
```
If 1 row returned → login success. Else → denied.

### Total Classes
```sql
COUNT(*)
```

### Present Count
```sql
SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)
```

### Percentage
```sql
(present_count / total_count) * 100
```

---

## 8. Final Report Query (single query)

```sql
SELECT 
  s.name,
  COUNT(a.id) AS total_classes,
  SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
  ROUND(
    (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100,
    2
  ) AS percentage,
  CASE
    WHEN (SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / COUNT(a.id)) * 100 < 75
      THEN 'Defaulter'
    ELSE 'Safe'
  END AS defaulter_status
FROM students s
LEFT JOIN attendance a ON s.id = a.student_id
GROUP BY s.id;
```

---

## 9. Defaulter Logic

If percentage < 75 → mark as defaulter

```sql
CASE 
  WHEN percentage < 75 THEN 'Defaulter'
  ELSE 'Safe'
END
```

---

## 10. Input

- Teacher username + password
- Student name
- Attendance status (Present / Absent)
- Date

---

## 11. Output

- Login success / failure
- Student name
- Total classes
- Present count
- Attendance percentage
- Defaulter flag

---

## 12. Constraints

- Simple plain-text password (MVP only, no hashing)
- No role separation (single teacher role)
- No subject separation
- Manual attendance marking
- Single-user system (one teacher)

---

## 13. Processing Strategy

- Store raw attendance data only
- Do NOT store percentage
- Always compute dynamically using SQL
- Session/token managed in app memory (no DB sessions)

---

## 14. UI Flow

1. Login screen → teacher enters username + password
2. On success → Dashboard with options:
   - Add student
   - Mark attendance
   - Generate report
3. Report displays:
   - Name | Total Classes | Present | Percentage | Status
   - Highlight rows < 75%

---

## 15. Expected Result

- Only authenticated teachers access the system
- Structured relational data
- Accurate percentage calculation
- Real-time identification of defaulters