# PROJECT OVERVIEW
SaaS Application for Facial Recognition Attendance. Teachers can log in, create classes, upload student portraits to train the AI, and upload group photos to automatically take attendance.

# CORE WORKFLOWS

## 1. Storage Processing (S3-Compatible)
- Create a reusable S3 service using `@aws-sdk/client-s3`.
- Read environment variables to route to MinIO (`http://localhost:9000`) for development, or Cloudflare R2 for production.

## 2. AWS Rekognition Management
- Initialize `@aws-sdk/client-rekognition`.
- Each `classId` corresponds to a unique `CollectionId` in AWS Rekognition to prevent cross-class false positives and improve scanning speed.

## 3. Register New Student (Index Face)
- Files never flow through a Server Action body (Vercel 4.5MB cap): the client calls `createUploadUrl` to mint a presigned PUT, then uploads **directly to MinIO/R2** — the original to `tmp/students/` (Rekognition-only) and a compressed copy to `students/`.
- The Server Action (`registerStudent`) receives only the object keys (`imageKey`, `avatarKey`).
- Server Action calls AWS Rekognition `IndexFacesCommand` on the original to save the face to the class's Collection, attaching the student `id` as the `ExternalImageId` (stable — `studentCode` is optional and mutable); the `tmp/` original is deleted afterwards (best-effort).
- Save student info + `awsFaceId` + `avatarKey` to Supabase, then initialize empty `grades` rows for every `classSubjects` link (both semesters).

## 4. Group Attendance (Search Faces)
- Teacher picks group photos -> same presigned-PUT flow: originals to `tmp/attendance/`, compressed copies to `attendance/` -> then calls the `groupAttendance` Server Action with the object keys.
- The action downloads the originals (falls back to the display copy when the original exceeds Rekognition's 5MB limit) and uses `Promise.all` to process all images via `SearchFacesByImageCommand`.
- Extract all `ExternalImageId`s from the results. Use a JavaScript `Set` to remove duplicates (if a student appears in multiple photos).
- Query Supabase for students in the class. Create `attendanceRecords` (default status: "VANG", if student's ID is in the Set, update to "CO_MAT"). `imageKeys` on the session stores the display copies.

## 5. Other Features (implemented beyond the core flow)
- Manual attendance + roll-call modal (per-student status: CO_MAT/VANG/VANG_PHEP/BO_TIET/DI_MUON), session close = read-only.
- Subject-first grade management: fixed columns TX1–TX4 / GK / CK, CSV import/export template, per-student comments.
- Duck-race mini-game (`/classes/[id]/race`) that randomly picks a student for oral checks; optional grade entry right after the race.
- Printable report cards ("phiếu điểm") with drag-and-drop template builder (`reportCardTemplates`), teacher signature image, and school name from `teacherSchools`.
- Auth: password or email-OTP login (feature flags), optional TOTP MFA, profile + password management.