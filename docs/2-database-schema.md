# DATABASE SCHEMA (SUPABASE POSTGRESQL)

**IMPORTANT:** All field names MUST be implemented in `camelCase`. When writing raw SQL for PostgreSQL, ensure camelCase column names are wrapped in double quotes (e.g., `"teacherId"`). Use Row Level Security (RLS) to isolate data based on `auth.users.id` (teacher).

## 1. Table: classes
- `id` (UUID, Primary Key)
- `name` (Text)
- `schoolYear` (Text, e.g. '2025-2026')
- `teacherId` (UUID, Foreign Key to auth.users.id)
- `createdAt` (Timestamptz)

## 2. Table: students
Class rosters are fixed per school year: 1 student belongs to exactly 1 class.
- `id` (UUID, Primary Key)
- `studentCode` (Text, Unique within a class)
- `lastName` (Text, họ + tên đệm)
- `firstName` (Text, tên)
- `dateOfBirth` (Date, nullable)
- `classId` (UUID, Foreign Key to classes.id)
- `awsFaceId` (Text, retrieved from AWS Rekognition)
- `avatarKey` (Text, MinIO/R2 object key — served via authenticated /api/image)
- `createdAt` (Timestamptz)

## 3. Table: attendanceSessions
- `id` (UUID, Primary Key)
- `classId` (UUID, Foreign Key to classes.id)
- `sessionDate` (Date)
- `imageKeys` (Text Array, object keys of the uploaded group photos)
- `createdAt` (Timestamptz)

## 4. Table: attendanceRecords
- `id` (UUID, Primary Key)
- `sessionId` (UUID, Foreign Key to attendanceSessions.id)
- `studentId` (UUID, Foreign Key to students.id)
- `status` (Text, enum: 'CO_MAT', 'VANG', 'VANG_PHEP' — vắng có phép)
- `confidence` (Float, AWS confidence score)
- `note` (Text, nullable — ghi chú, VD: lý do vắng phép)
- `createdAt` (Timestamptz)

## 5. Table: subjects
Owned by a teacher and reused across all of that teacher's classes (a teacher teaches 1-3 subjects).
- `id` (UUID, Primary Key)
- `teacherId` (UUID, Foreign Key to auth.users.id)
- `name` (Text, unique per teacher)
- `code` (Text, nullable, internal subject code)
- `createdAt` (Timestamptz)

## 6. Table: grades
Flat table, no deep joins. `classId` is denormalized so grade lookups by class do not require joining `students`. School year is derived via `classId` -> `classes.schoolYear`.
- `id` (UUID, Primary Key)
- `studentId` (UUID, Foreign Key to students.id)
- `subjectId` (UUID, Foreign Key to subjects.id)
- `classId` (UUID, Foreign Key to classes.id)
- `semester` (Smallint, 1-3)
- `scoreType` (Text, enum: 'THUONG_XUYEN', 'MIENG', 'PHUT_15', 'TIET_1', 'GIUA_KY', 'CUOI_KY')
- `score` (Numeric(4,2), 0-10)
- `weight` (Smallint, default 1)
- `note` (Text, nullable)
- `createdAt` (Timestamptz)
- Unique: (`studentId`, `subjectId`, `semester`, `scoreType`)
- Index: (`classId`, `subjectId`, `semester`) for fast per-class grade sheets
- RLS: 1-hop check via `subjects."teacherId" = auth.uid()`

## 6b. Table: classSubjects (teaching assignment, many-to-many)
A subject teacher teaches at MANY classes; a class has MANY subjects. Since `subjects` already carries `teacherId`, this table is the only link needed — no separate teacher-class table.
- `id` (UUID, Primary Key)
- `classId` (UUID, Foreign Key to classes.id)
- `subjectId` (UUID, Foreign Key to subjects.id)
- `createdAt` (Timestamptz)
- Unique: (`classId`, `subjectId`)
- RLS: insert requires BOTH the class and the subject to belong to `auth.uid()`

## 7. View: studentGradeSummaries
Weighted-average statistics per student / subject / class / semester. Created with `security_invoker = true` so base-table RLS still applies — teachers only see their own data.
- `studentId`, `subjectId`, `classId`, `semester`
- `averageScore` = `sum(score * weight) / sum(weight)`, rounded to 2 decimals
- `gradeCount` = number of grade entries in the group

Query example (per-class grade sheet for one subject/semester):
```sql
select * from "studentGradeSummaries"
where "classId" = $1 and "subjectId" = $2 and "semester" = $3;
```