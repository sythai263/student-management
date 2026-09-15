import { GRADE_SLOT_LABEL } from "@constants";
import type { ReportCardFieldKey } from "@types";

export interface ReportCardFieldDef {
  key: ReportCardFieldKey;
  label: string;
  group: "Thông tin" | "Điểm" | "Khác";
}

/** Fixed field catalogue — teachers pick from this list, never type a key by hand. */
export const REPORT_CARD_FIELDS: ReportCardFieldDef[] = [
  { key: "subjectName", label: "Môn học", group: "Thông tin" },
  { key: "studentName", label: "Tên học sinh", group: "Thông tin" },
  { key: "studentCode", label: "Mã học sinh", group: "Thông tin" },
  { key: "classCode", label: "Mã lớp", group: "Thông tin" },
  { key: "className", label: "Tên lớp", group: "Thông tin" },
  { key: "semesterLabel", label: "Học kỳ", group: "Thông tin" },
  { key: "tx1", label: GRADE_SLOT_LABEL.tx1, group: "Điểm" },
  { key: "tx2", label: GRADE_SLOT_LABEL.tx2, group: "Điểm" },
  { key: "tx3", label: GRADE_SLOT_LABEL.tx3, group: "Điểm" },
  { key: "tx4", label: GRADE_SLOT_LABEL.tx4, group: "Điểm" },
  { key: "gk", label: GRADE_SLOT_LABEL.gk, group: "Điểm" },
  { key: "ck", label: GRADE_SLOT_LABEL.ck, group: "Điểm" },
  { key: "average", label: "Điểm trung bình", group: "Điểm" },
  { key: "comment", label: "Nhận xét", group: "Khác" },
  { key: "signDate", label: "Ngày ký", group: "Khác" },
  { key: "teacherName", label: "Tên giáo viên", group: "Khác" },
];

export const REPORT_CARD_FIELD_LABEL: Record<ReportCardFieldKey, string> =
  Object.fromEntries(REPORT_CARD_FIELDS.map((f) => [f.key, f.label])) as Record<
    ReportCardFieldKey,
    string
  >;
