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
- Next.js Client compresses the image -> calls a Server Action.
- Server Action uploads the image to MinIO/R2 and retrieves the URL.
- Server Action calls AWS Rekognition `IndexFacesCommand` to save the face to the class's Collection, attaching `studentCode` as the `ExternalImageId`.
- Save student info + `awsFaceId` to Supabase.

## 4. Group Attendance (Search Faces)
- Teacher uploads an array of group photos -> calls Server Action.
- Use `Promise.all` to process all images via `SearchFacesByImageCommand`.
- Extract all `ExternalImageId`s from the results. Use a JavaScript `Set` to remove duplicates (if a student appears in multiple photos).
- Query Supabase for students in the class. Create `attendanceRecords` (default status: "VANG", if student's ID is in the Set, update to "CO_MAT").