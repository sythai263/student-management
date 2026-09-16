export interface Student {
  id: string;
  studentCode: string | null;
  lastName: string;
  firstName: string;
  dateOfBirth: string | null;
  classId: string;
  awsFaceId: string | null;
  avatarKey: string | null;
  createdAt: string;
}
