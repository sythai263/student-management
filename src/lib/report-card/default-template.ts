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
      type: "fieldRow",
      columns: 3,
      items: [
        { field: "subjectName", label: "Môn" },
        { field: "studentName", label: "Học sinh" },
        { field: "studentCode", label: "Mã HS" },
      ],
    },
    {
      id: createBlockId(),
      type: "fieldRow",
      columns: 2,
      items: [
        { field: "classCode", label: "Mã lớp" },
        { field: "className", label: "Tên lớp" },
      ],
    },
    {
      id: createBlockId(),
      type: "fieldRow",
      columns: 2,
      items: [
        { field: "tx1", label: "TX1" },
        { field: "tx2", label: "TX2" },
        { field: "tx3", label: "TX3" },
        { field: "tx4", label: "TX4" },
      ],
    },
    {
      id: createBlockId(),
      type: "fieldRow",
      columns: 1,
      items: [
        { field: "gk", label: "Giữa kỳ" },
        { field: "ck", label: "Cuối kỳ" },
      ],
    },
    { id: createBlockId(), type: "average", label: "Điểm trung bình" },
    { id: createBlockId(), type: "comment", label: "Nhận xét" },
    {
      id: createBlockId(),
      type: "signature",
      dateLabel: "Ngày ký",
      roleLabel: "Giáo viên",
    },
  ];
}
