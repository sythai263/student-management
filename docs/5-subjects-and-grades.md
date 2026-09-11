# SUBJECT & GRADE SETUP LOGIC

This document describes the intended logic for managing high-school subjects, assigning them to classes, and automatically preparing grade rows for every student.

## 1. Assumptions

- The system is used by a single teacher at a time.
- A teacher owns a small set of subjects (1–10) via `subjects.teacherId`.
- A class is also owned by the same teacher (`classes.teacherId`).
- The `classSubjects` table links a class with the subjects actually taught in that class.
- Grades are stored in the redesigned `grades` table: one row per `(classId, subjectId, semester, studentId)` with fixed columns `tx1..tx4`, `gk`, `ck`.

## 2. Default Subject Catalog

A built-in catalog of Vietnamese high-school subjects is maintained in `src/constants/subjects.ts`. Teachers pick from this list to create their own `subjects` rows; they can also add custom subjects.

Catalog items (code is for internal reference and can be blank):

- `MATH` — Toán
- `PHYS` — Vật lý
- `CHEM` — Hóa học
- `BIO` — Sinh học
- `COMP` — Tin học
- `TECH` — Công nghệ
- `LIT` — Ngữ văn
- `HIST` — Lịch sử
- `GEO` — Địa lý
- `CIVIC` — Giáo dục công dân
- `ENG` — Tiếng Anh
- `DEF` — Giáo dục quốc phòng và an ninh
- `PE` — Thể dục

## 3. Teacher Subject Setup Flow

1. Teacher visits `/subjects`.
2. Existing teacher-owned subjects are listed (`SubjectList`).
3. From the "Danh mục môn cấp 3" section, the teacher selects one or more catalog entries.
4. `bulkCreateFromCatalog` inserts only the selected names into `subjects` (owned by `teacherId`), skipping duplicates per `subjects.teacherId`.
5. Teacher can still create custom subjects via `createSubject`.

## 4. Class-Subject Assignment

1. On the class detail page, the teacher sees all teacher-owned subjects.
2. Checkboxes mark which subjects are taught in that class.
3. `assignSubjectToClass` inserts into `classSubjects`.
4. `removeSubjectFromClass` deletes the link (does not delete `subjects`).

This step is the source of truth for which grade columns each student in the class should have.

## 5. Auto-Create Grade Rows for New Students

When a student is added to a class (single `registerStudent` or bulk `importStudents`):

1. Insert the student into `students`.
2. Query `classSubjects` where `classId = newStudent.classId`.
3. For every `classSubject`, for each semester (`1` and `2`):
   - Insert one `grades` row with all score columns `null` unless the row already exists.
   - Columns: `classId`, `subjectId`, `semester`, `studentId`, `tx1`, `tx2`, `tx3`, `tx4`, `gk`, `ck`, `averageScore`, `note`, `comment`.

This ensures the grade entry grid shows the student immediately when a subject is selected.

## 6. Files Involved in the Implementation

| Concern | Location |
| --- | --- |
| Default catalog | `src/constants/subjects.ts` (re-export via `@constants`) |
| Subject catalog schema | `src/schemas/subjects.ts` |
| Subject actions | `src/lib/actions/subjects.ts` |
| Class-subject actions | `src/lib/actions/class-subjects.ts` or `src/lib/actions/subjects.ts` |
| Class-subject hooks | `src/hooks/subjects.ts` or `src/hooks/class-subjects.ts` |
| Student registration | `src/lib/actions/register-student.ts` |
| Student import | `src/lib/actions/import-students.ts` |
| Grade row initializer | `src/lib/grade-utils.ts` or `src/lib/grades.ts` |
| Subject setup UI | `src/app/subjects/page.tsx`, `src/components/subjects/*` |
| Class-subject UI | `src/app/classes/[id]/page.tsx` or `src/app/classes/[id]/subjects/page.tsx` |

## 7. RLS Notes

- `subjects` is filtered by `teacherId`.
- `classSubjects` insert must verify both `classId` and `subjectId` belong to the current teacher.
- `grades` insert must verify the same.
