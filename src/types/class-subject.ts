import type { Class } from "./class";
import type { Subject } from "./subject";

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  createdAt: string;
}

export interface ClassSubjectWithSubject extends ClassSubject {
  subjects: Pick<Subject, "name" | "code"> | null;
}

export interface ClassSubjectWithClass extends ClassSubject {
  classes: Pick<Class, "name" | "classCode" | "schoolYear"> | null;
}
