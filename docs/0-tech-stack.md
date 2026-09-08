# TECH STACK & DEVELOPMENT ENVIRONMENT

You must strictly adhere to the following technologies and versions. Do not suggest or install alternatives unless explicitly requested.

## 1. Core Framework & Language
- **Framework:** Next.js App Router (Latest version).
- **Language:** TypeScript 7 (`typescript@^7`). Ensure strict mode is enabled. No `any`.
- **Package Manager:** `pnpm` MUST be used for all installations.

## 2. UI & Styling
- **CSS Framework:** Tailwind CSS v4[cite: 1].
- **UI Library:** **shadcn/ui** (Latest CLI). 
  - Add components using `pnpm dlx shadcn@latest add <name> -y -o`[cite: 1].
  - Theme: `radix-nova`, RSC[cite: 1].
  - Root layout must use `className="dark"`[cite: 1].
  - All shadcn primitives must live in `src/components/ui/` and be imported via `@components/ui` or `@/components/ui`[cite: 1]. Do NOT hand-roll duplicates[cite: 2].

## 3. Data Fetching & State Management
- **Client Data/Mutation:** React Query v5[cite: 1].
- **Forms:** React Hook Form + Zod (placed in `schemas/`). Prefer using shadcn `Form` + `@hookform/resolvers`[cite: 1].

## 4. Backend, Database & Auth
- **BaaS:** Supabase (Latest version of `@supabase/supabase-js` / `@supabase/ssr`).
- **Database:** PostgreSQL (via Supabase). All database schemas and queries MUST use `camelCase` for field names. Row Level Security (RLS) is mandatory.

## 5. AI & Storage (External Services)
- **Facial Recognition:** AWS Rekognition (`@aws-sdk/client-rekognition`).
- **Object Storage (S3-Compatible):** MinIO for Local/Testing and Cloudflare R2 for Production (`@aws-sdk/client-s3`).