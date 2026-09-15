import type { ReportCardBlock } from "@types";

let seq = 0;
/** Stable-ish unique id for a new block — templates are edited client-side only. */
export function createBlockId(): string {
  seq += 1;
  return `block-${Date.now()}-${seq}`;
}

/**
 * Built-in layout used whenever a teacher hasn't designed/selected a
 * template of their own — recreates the original fixed report card.
 */
export function defaultReportCardBlocks(): ReportCardBlock[] {
  return [
    {
      id: createBlockId(),
      type: "letterhead",
      schoolName: "Tên trường",
      title: "Phiếu điểm",
      ratio: "2-3",
    },
    {
      id: createBlockId(),
      type: "fieldRow",
      columns: 2,
      items: [
        { field: "semesterLabel", label: "Học kỳ" },
        { field: "subjectName", label: "Môn học" },
      ],
    },
    {
      id: createBlockId(),
      type: "fieldRow",
      columns: 2,
      items: [
        { field: "className", label: "Tên lớp" },
        { field: "classCode", label: "Mã Lớp" },
      ],
    },
    {
      id: createBlockId(),
      type: "fieldRow",
      columns: 2,
      items: [
        { field: "studentName", label: "Tên học sinh" },
        { field: "studentCode", label: "Mã học sinh" },
      ],
    },
    { id: createBlockId(), type: "scoreTable" },
    { id: createBlockId(), type: "average", label: "Điểm trung bình" },
    {
      id: createBlockId(),
      type: "signature",
      dateLabel: "Ngày",
      roleLabel: "Giáo viên bộ môn",
      showComment: true,
      commentLabel: "Nhận xét",
      ratio: "2-1",
    },
  ];
}
