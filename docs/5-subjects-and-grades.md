# SUBJECT & GRADE SETUP LOGIC

This document describes the intended logic for managing high-school subjects, assigning them to classes, and navigating/grading in a subject-first workflow.

## 1. Assumptions

- The system is used by a single teacher at a time.
- A teacher owns a small set of subjects (1–10) via `subjects.teacherId`.
- A class is also owned by the same teacher (`classes.teacherId`).
- The `classSubjects` table links a class with the subjects actually taught in that class.
- Grades are stored in the redesigned `grades` table: one row per `(classId, subjectId, semester, studentId)` with fixed columns `tx1..tx4`, `gk`, `ck`.

## 2. Navigation Flow (Subject-First)

The primary workflow is organized by subject first, then class.

1. **Home `/`** — Teacher sees all teacher-owned subjects (`SubjectList`).
2. **Subject detail `/subjects/[subjectId]`** — Lists every class that teaches this subject and provides a **Tạo lớp cho môn này** button. Creating a class from here:
   - Inserts a new `classes` row owned by the teacher.
   - Automatically assigns the current subject to the new class via `classSubjects`.
   - Redirects to `/classes/[classId]?subjectId=[subjectId]` so the teacher can immediately manage the class under that subject.
3. **Class detail with subject `/classes/[classId]?subjectId=[subjectId]`** — Operate within the context of one chosen subject and one class.
   - The header shows the selected subject.
   - `ClassSubjectManager` is hidden because the subject is already fixed.
   - The **Nhập điểm** link goes to `/classes/[classId]/grades?subjectId=[subjectId]` and locks the subject selector.
   - Other class-level actions (register/import students, attendance, duck-race) remain available.
4. **General class management `/classes`** — Separate page to create/view classes and assign subjects without a subject context.

## 3. Default Subject Catalog

The global catalog of Vietnamese high-school subjects lives in the `subjectCatalog` table. It is created by migration `supabase/migrations/0005_subject_catalog.sql` and contains 13 standard subjects. Teachers pick from this catalog to create their own `subjects` rows (owned by `teacherId`); they can also create custom subjects not in the catalog.

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

## 4. Teacher Subject Setup Flow

1. Teacher visits `/subjects`.
2. Existing teacher-owned subjects are listed (`SubjectList`).
3. From the "Danh mục môn cấp 3" section, the teacher selects one or more catalog entries.
4. `createSubjectsFromCatalog` looks up the selected names in `subjectCatalog`, then inserts the matching entries into `subjects` (owned by `teacherId`), skipping duplicates per `subjects.teacherId`.
5. Teacher can still create custom subjects via `createSubject`.

## 5. Class-Subject Assignment

1. On `/classes` or `/classes/[classId]` (without `subjectId`), the teacher sees all teacher-owned subjects.
2. Checkboxes mark which subjects are taught in that class.
3. `assignSubjectToClass` inserts into `classSubjects`.
4. `removeSubjectFromClass` deletes the link (does not delete `subjects`).

This step is the source of truth for which grade columns each student in the class should have.

## 6. Auto-Create Grade Rows for New Students

When a student is added to a class (single `registerStudent` or bulk `importStudents`):

1. Insert the student into `students`.
2. Query `classSubjects` where `classId = newStudent.classId`.
3. For every `classSubject`, for each semester (`1` and `2`):
   - Insert one `grades` row with all score columns `null` unless the row already exists.
   - Columns: `classId`, `subjectId`, `semester`, `studentId`, `tx1`, `tx2`, `tx3`, `tx4`, `gk`, `ck`, `averageScore`, `note`, `comment`.

This ensures the grade entry grid shows the student immediately when a subject is selected.

## 7. Files Involved in the Implementation

| Concern                     | Location                                                                    |
| --------------------------- | --------------------------------------------------------------------------- |
| Default catalog (DB table)  | `src/constants/subjects.ts` (`supabase/migrations/0005_subject_catalog.sql` |
|                             | Subject catalog hook                                                        | `src/hooks/subjects.ts` (`useSubjectCatalog`) | ) |
| Subject catalog schema      | `src/schemas/subjects.ts`                                                   |
| Subject actions             | `src/lib/actions/subjects.ts`                                               |
| Class-subject actions       | `src/lib/actions/class-subjects.ts`                                         |
| Class-subject hooks         | `src/hooks/class-subjects.ts`                                               |
| Student registration        | `src/lib/actions/register-student.ts`                                       |
| Student import              | `src/lib/actions/import-students.ts`                                        |
| Grade row initializer       | `src/lib/grades.ts`                                                         |
| Subject setup UI            | `src/app/subjects/page.tsx`, `src/components/subjects/*`                    |
| Subject-first class list    | `src/app/subjects/[id]/page.tsx`                                            |
| Subject-scoped class detail | `src/app/classes/[id]/page.tsx` with `?subjectId`                           |
| Locked grade dashboard      | `src/components/grades/grade-dashboard.tsx`                                 |

## 8. RLS Notes

- `subjects` is filtered by `teacherId`.
- `classSubjects` insert must verify both `classId` and `subjectId` belong to the current teacher.
- `grades` insert must verify the same.
