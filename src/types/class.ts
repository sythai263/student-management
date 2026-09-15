/** Row types mirroring the Supabase schema (camelCase columns). */

export interface Class {
  id: string;
  classCode: string;
  name: string;
  schoolYear: string;
  teacherId: string;
  createdAt: string;
}
