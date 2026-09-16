# EXECUTION PLAN
Execute this plan step-by-step. **STOP and wait for my confirmation** after completing each step before moving to the next one[cite: 2].

- [x] **Step 1:** Write the SQL script to create the Database Schema in `camelCase` and set up RLS policies for the 4 tables in Supabase.
- [x] **Step 2:** Setup configuration files and utility clients (Supabase server client, AWS S3 S3Client for MinIO/R2, AWS Rekognition Client). Ensure they follow the 2nd-level barrel pattern[cite: 1].
- [x] **Step 3:** Implement the Server Action for "Register New Student" (Image compression -> Upload to MinIO/R2 -> AWS IndexFaces -> Insert to Supabase).
- [x] **Step 4:** Implement the Server Action for "Group Attendance" (Receive array of photos -> AWS SearchFacesByImage -> JavaScript Set logic to deduplicate -> Insert/Update Supabase `attendanceRecords`).
- [x] **Step 5:** Build the Frontend UI (Next.js App Router pages) using shadcn/ui components (latest CLI) and Tailwind CSS v4[cite: 1] to integrate the server actions.
