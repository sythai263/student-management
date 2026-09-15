export interface Subject {
  id: string;
  teacherId: string;
  name: string;
  code: string | null;
  createdAt: string;
}

export interface SubjectCatalog {
  id: string;
  name: string;
  code: string | null;
  createdAt: string;
}
