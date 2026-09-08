# DATABASE SCHEMA (SUPABASE POSTGRESQL)

**IMPORTANT:** All field names MUST be implemented in `camelCase`. When writing raw SQL for PostgreSQL, ensure camelCase column names are wrapped in double quotes (e.g., `"teacherId"`). Use Row Level Security (RLS) to isolate data based on `auth.users.id` (teacher).

## 1. Table: classes
- `id` (UUID, Primary Key)
- `name` (Text)
- `teacherId` (UUID, Foreign Key to auth.users.id)
- `createdAt` (Timestamptz)

## 2. Table: students
- `id` (UUID, Primary Key)
- `studentCode` (Text, Unique within a class)
- `name` (Text)
- `classId` (UUID, Foreign Key to classes.id)
- `awsFaceId` (Text, retrieved from AWS Rekognition)
- `avatarUrl` (Text, MinIO/R2 URL)
- `createdAt` (Timestamptz)

## 3. Table: attendanceSessions
- `id` (UUID, Primary Key)
- `classId` (UUID, Foreign Key to classes.id)
- `sessionDate` (Date)
- `imageUrls` (Text Array, URLs of the uploaded group photos)
- `createdAt` (Timestamptz)

## 4. Table: attendanceRecords
- `id` (UUID, Primary Key)
- `sessionId` (UUID, Foreign Key to attendanceSessions.id)
- `studentId` (UUID, Foreign Key to students.id)
- `status` (Text, enum: 'CO_MAT', 'VANG')
- `confidence` (Float, AWS confidence score)
- `createdAt` (Timestamptz)