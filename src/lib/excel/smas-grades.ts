import type ExcelJS from "exceljs";
import type { GradeSlot } from "@constants";
import { normalizeSchoolName } from "@lib/string";

/** One student's row in the SMAS grade sheet. */
export interface SmasGradeRow {
  studentCode: string;
  fullName: string;
  scores: Record<GradeSlot, number | null>;
  average: number | null;
  comment: string;
}

export interface SmasGradeSheetInput {
  /** e.g. "THCS Viettel9" — empty string when the class is unmapped. */
  schoolName: string;
  subjectName: string;
  className: string;
  schoolYear: string;
  semester: number;
  rows: SmasGradeRow[];
}

const SEMESTER_ROMAN: Record<number, string> = { 1: "I", 2: "II" };

const FONT = { name: "Times New Roman", size: 11 } as const;

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const CENTER: Partial<ExcelJS.Alignment> = {
  horizontal: "center",
  vertical: "middle",
};

const LAST_COL = 12; // column L
const HEADER_ROW = 12;
const FIRST_DATA_ROW = 14;

function borderRange(ws: ExcelJS.Worksheet, firstRow: number, lastRow: number) {
  for (let r = firstRow; r <= lastRow; r++) {
    for (let c = 1; c <= LAST_COL; c++) {
      ws.getCell(r, c).border = THIN_BORDER;
    }
  }
}

/**
 * Build one SMAS-style grade sheet ("Bảng kết quả đánh giá môn … - lớp …")
 * inside the given workbook. Layout mirrors the Viettel SMAS import template:
 * ministry/school header at A3:C4, title rows 6–7, two-row table header on
 * rows 12–13 (ĐĐG TX spans E:H, Họ và tên spans C:D), data from row 14.
 */
export function addSmasGradeSheet(
  workbook: ExcelJS.Workbook,
  input: SmasGradeSheetInput,
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet("Bang diem");
  const roman = SEMESTER_ROMAN[input.semester] ?? String(input.semester);

  ws.columns = [
    { key: "stt", width: 7 },
    { key: "code", width: 20 },
    { key: "nameC", width: 9 },
    { key: "nameD", width: 16 },
    { key: "tx1", width: 6 },
    { key: "tx2", width: 6 },
    { key: "tx3", width: 6 },
    { key: "tx4", width: 6 },
    { key: "gk", width: 8 },
    { key: "ck", width: 8 },
    { key: "tbm", width: 9 },
    { key: "comment", width: 45 },
  ];

  // Ministry + school block (top-left, rows 3–4).
  ws.mergeCells("A3:C3");
  ws.mergeCells("A4:C4");
  ws.getCell("A3").value = "BỘ GIÁO DỤC VÀ ĐÀO TẠO";
  // School names may contain intentional line breaks — keep them.
  ws.getCell("A4").value = normalizeSchoolName(input.schoolName, {
    keepLineBreaks: true,
  }).toUpperCase();
  for (const addr of ["A3", "A4"]) {
    const cell = ws.getCell(addr);
    cell.font = { ...FONT, bold: true };
    cell.alignment = { ...CENTER, wrapText: true };
  }

  // Title + semester lines, centered across the table (rows 6–7).
  ws.mergeCells("A6:L6");
  const title = ws.getCell("A6");
  title.value = `BẢNG KẾT QUẢ ĐÁNH GIÁ MÔN ${input.subjectName.toUpperCase()} - LỚP ${input.className.toUpperCase()}`;
  title.font = { ...FONT, bold: true, size: 13 };
  title.alignment = CENTER;

  ws.mergeCells("A7:L7");
  const subtitle = ws.getCell("A7");
  subtitle.value = `Học kỳ ${roman} - Năm học ${input.schoolYear}`;
  subtitle.font = FONT;
  subtitle.alignment = CENTER;

  // Two-row table header (rows 12–13).
  ws.mergeCells("A12:A13");
  ws.mergeCells("B12:B13");
  ws.mergeCells("C12:D13");
  ws.mergeCells("E12:H12");
  ws.mergeCells("I12:I13");
  ws.mergeCells("J12:J13");
  ws.mergeCells("K12:K13");
  ws.mergeCells("L12:L13");

  ws.getCell("A12").value = "STT";
  ws.getCell("B12").value = "Mã học sinh";
  ws.getCell("C12").value = "Họ và tên";
  ws.getCell("E12").value = "ĐĐG TX";
  ws.getCell("E13").value = 1;
  ws.getCell("F13").value = 2;
  ws.getCell("G13").value = 3;
  ws.getCell("H13").value = 4;
  ws.getCell("I12").value = "ĐĐG GK";
  ws.getCell("J12").value = "ĐĐG CK";
  ws.getCell("K12").value = `TBM HK${roman}`;
  ws.getCell("L12").value = `Nhận xét HK${roman}`;

  for (let r = HEADER_ROW; r <= HEADER_ROW + 1; r++) {
    for (let c = 1; c <= LAST_COL; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { ...FONT, bold: true };
      cell.alignment = { ...CENTER, wrapText: true };
    }
  }
  ws.getRow(HEADER_ROW).height = 20;
  ws.getRow(HEADER_ROW + 1).height = 20;

  // Data rows (from row 14); "Họ và tên" occupies C:D merged.
  input.rows.forEach((row, i) => {
    const r = FIRST_DATA_ROW + i;
    ws.mergeCells(r, 3, r, 4);
    const values: { col: number; value: string | number | null }[] = [
      { col: 1, value: i + 1 },
      { col: 2, value: row.studentCode },
      { col: 3, value: row.fullName },
      { col: 5, value: row.scores.tx1 },
      { col: 6, value: row.scores.tx2 },
      { col: 7, value: row.scores.tx3 },
      { col: 8, value: row.scores.tx4 },
      { col: 9, value: row.scores.gk },
      { col: 10, value: row.scores.ck },
      { col: 11, value: row.average },
      { col: 12, value: row.comment || null },
    ];
    for (const { col, value } of values) {
      const cell = ws.getCell(r, col);
      cell.value = value;
      cell.font = FONT;
      cell.alignment = col === 12 ? { vertical: "middle", wrapText: true } : CENTER;
    }
  });

  borderRange(ws, HEADER_ROW, FIRST_DATA_ROW + Math.max(input.rows.length, 1) - 1);
  return ws;
}
