export interface Student {
  id: string;
  studentCode: string | null;
  lastName: string;
  firstName: string;
  /** Distinguishing mark for same-name students, shown as "(A)". */
  nameSuffix: string | null;
  dateOfBirth: string | null;
  classId: string;
  awsFaceId: string | null;
  avatarKey: string | null;
  createdAt: string;
}
