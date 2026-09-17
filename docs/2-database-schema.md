# DATABASE SCHEMA (SUPABASE POSTGRESQL)

**IMPORTANT:** All field names MUST be implemented in `camelCase`. When writing raw SQL for PostgreSQL, ensure camelCase column names are wrapped in double quotes (e.g., `"teacherId"`). Use Row Level Security (RLS) to isolate data based on `auth.users.id` (teacher).

## 1. Table: classes
- `id` (UUID, Primary Key)
- `classCode` (Text, unique — e.g. '10A1')
- `name` (Text)
- `schoolYear` (Text, e.g. '2025-2026')
- `teacherId` (UUID, Foreign Key to auth.users.id)
- `schoolId` (UUID, nullable, Foreign Key to teacherSchools.id, ON DELETE SET NULL — migration 0012)
- `createdAt` (Timestamptz)
- RLS: insert/update require `teacherId = auth.uid()` AND (`schoolId` is null or belongs to the same teacher)

## 2. Table: students
Class rosters are fixed per school year: 1 student belongs to exactly 1 class.
- `id` (UUID, Primary Key)
- `studentCode` (Text, nullable — optional label; unique within a class when set — `unique ("studentCode", "classId")`, NULLs never conflict)
- `lastName` (Text, họ + tên đệm)
- `firstName` (Text, tên)
- `nameSuffix` (Text, nullable — ký hiệu phân biệt học sinh trùng tên, hiển thị dạng "Vĩnh (A)"; name matching treats (lastName, firstName, nameSuffix) as the identity)
- `dateOfBirth` (Date, nullable)
- `classId` (UUID, Foreign Key to classes.id)
- `awsFaceId` (Text, nullable — retrieved from AWS Rekognition)
- `avatarKey` (Text, nullable — MinIO/R2 object key under `students/`, served via authenticated /api/image)
- `createdAt` (Timestamptz)

Note: the original portrait is uploaded under `tmp/students/` only for Rekognition indexing and deleted afterwards — it is NOT stored on the row.

## 3. Table: attendanceSessions
- `id` (UUID, Primary Key)
- `classId` (UUID, Foreign Key to classes.id)
- `sessionDate` (Date, default current_date)
- `name` (Text, nullable — custom session name, migration 0007)
- `imageKeys` (Text Array — object keys of the COMPRESSED display photos under `attendance/`; originals live under `tmp/attendance/` and are deleted after Rekognition)
- `closed` (Boolean, default false — a closed session is read-only)
- `createdAt` (Timestamptz)

## 4. Table: attendanceRecords
- `id` (UUID, Primary Key)
- `sessionId` (UUID, Foreign Key to attendanceSessions.id)
- `studentId` (UUID, Foreign Key to students.id)
- `status` (Text, enum: 'CO_MAT' có mặt, 'VANG' vắng, 'VANG_PHEP' vắng có phép, 'BO_TIET' bỏ tiết, 'DI_MUON' đi muộn)
- `confidence` (Float, nullable — AWS confidence score)
- `note` (Text, nullable — ghi chú, VD: lý do vắng phép)
- `createdAt` (Timestamptz)
- Unique: (`sessionId`, `studentId`)

## 5. Table: subjects
Owned by a teacher and reused across all of that teacher's classes (a teacher teaches 1-3 subjects).
- `id` (UUID, Primary Key)
- `teacherId` (UUID, Foreign Key to auth.users.id)
- `name` (Text, unique per teacher)
- `code` (Text, nullable, internal subject code)
- `createdAt` (Timestamptz)

## 6. Table: grades (redesigned — migration 0004)
One row per `(classId, subjectId, semester, studentId)` with fixed score columns — replaces the old `scoreType`/`score`/`weight` model (dropped in 0004).
- `id` (UUID, Primary Key)
- `classId` (UUID, Foreign Key to classes.id)
- `subjectId` (UUID, Foreign Key to subjects.id)
- `semester` (Smallint, 1-2)
- `studentId` (UUID, Foreign Key to students.id)
- `tx1`..`tx4` (Numeric(3,1), 0-10, nullable — điểm thường xuyên, hệ số 1; at least 2 required, enforced app-side)
- `gk` (Numeric(3,1), 0-10, nullable — giữa kỳ, hệ số 2)
- `ck` (Numeric(3,1), 0-10, nullable — cuối kỳ, hệ số 3)
- `averageScore` (Numeric(4,2), nullable — weighted average computed app-side)
- `note` (Text, nullable — ghi chú bảng điểm)
- `comment` (Text, nullable — nhận xét của giáo viên)
- `createdAt`, `updatedAt` (Timestamptz)
- Unique: (`classId`, `subjectId`, `semester`, `studentId`)
- Indexes: (`classId`, `subjectId`, `semester`), (`studentId`), (`subjectId`)
- RLS: ALL operations require BOTH `classes."teacherId"` AND `subjects."teacherId"` = `auth.uid()`

## 6a. Table: gradeWeights (global reference — migration 0004)
Maps each score slot to its coefficient: `tx1`..`tx4` weight 1, `gk` weight 2, `ck` weight 3.
- `slot` (Text, Primary Key)
- `weight` (Smallint, > 0)
- `label` (Text — 'TX1', 'GK'...)
- `fullLabel` (Text — 'Điểm thường xuyên 1'...)
- RLS: select for any authenticated user

## 6b. Table: classSubjects (teaching assignment, many-to-many)
A subject teacher teaches at MANY classes; a class has MANY subjects. Since `subjects` already carries `teacherId`, this table is the only link needed — no separate teacher-class table.
- `id` (UUID, Primary Key)
- `classId` (UUID, Foreign Key to classes.id)
- `subjectId` (UUID, Foreign Key to subjects.id)
- `createdAt` (Timestamptz)
- Unique: (`classId`, `subjectId`)
- RLS: insert requires BOTH the class and the subject to belong to `auth.uid()`

## 8. Table: subjectCatalog (migration 0005)
Global reference list of 13 Vietnamese high-school subjects. Teachers pick entries to create their own `subjects` rows.
- `id` (UUID, Primary Key)
- `name` (Text, unique — 'Toán', 'Vật lý'...)
- `code` (Text, nullable — 'MATH', 'PHYS'...)
- `createdAt` (Timestamptz)
- RLS: select for everyone (`using (true)`)

## 9. Table: teacherSignatures (migration 0010)
At most one signature image per teacher, used when printing report cards.
- `teacherId` (UUID, Primary Key, Foreign Key to auth.users.id)
- `imageKey` (Text — MinIO/R2 key under `signatures/<teacherId>/`)
- `updatedAt` (Timestamptz)
- RLS: `auth.uid() = "teacherId"` on all operations

## 10. Table: reportCardTemplates (migration 0011)
Teacher-designed report card layouts — ordered JSON blocks bound to a fixed field catalogue (no free-form HTML).
- `id` (UUID, Primary Key)
- `teacherId` (UUID, Foreign Key to auth.users.id)
- `name` (Text)
- `blocks` (JSONB — block types: fieldRow/average/comment/signature/divider)
- `isDefault` (Boolean — one default per teacher, enforced app-side)
- `createdAt`, `updatedAt` (Timestamptz)
- Index: (`teacherId`); RLS: `auth.uid() = "teacherId"` on all operations

## 11. Table: teacherSchools (migration 0012)
Schools the teacher teaches at; classes optionally map to one so report cards fill the school name.
- `id` (UUID, Primary Key)
- `teacherId` (UUID, Foreign Key to auth.users.id)
- `name` (Text — may contain newlines for multi-line print headers)
- `createdAt` (Timestamptz)
- Unique: (`teacherId`, `name`); RLS: `auth.uid() = "teacherId"` on all operations

## 12. View: studentGradeSummaries
Created with `security_invoker = true` so base-table RLS applies — teachers only see their own data. Redefined in migration 0004:
- `studentId`, `subjectId`, `classId`, `semester`
- `averageScore` — placeholder (`null`); the weighted average is computed app-side (`src/lib/grade-utils.ts`) and stored on the `grades` row
- `gradeCount` — number of non-null score slots (tx1..tx4, gk, ck)

Query example (per-class grade sheet for one subject/semester):
```sql
select * from "studentGradeSummaries"
where "classId" = $1 and "subjectId" = $2 and "semester" = $3;
```

## 12a. View: sessionRecordCounts (migration 0014)
`security_invoker = true`. One row per session: `sessionId`, `classId`, `recordCount` — powers the "cần điểm danh bổ sung" badge on the session list (`roster size - recordCount`) without fetching every record row.

## 13. Helper functions (migration 0008)
- `remove_diacritics(text)` — lower-case + strip Vietnamese diacritics (unaccent in `extensions` schema, pinned `search_path`)
- `search_students(classId, search, page, pageSize)` — diacritic-insensitive student search + pagination over `studentCode`/`lastName`/`firstName`, returns `{ students, total }`; granted to `authenticated`