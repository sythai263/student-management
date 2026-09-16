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

function borderRange(ws: ExcelJS.Worksheet, firstRow: number, lastRow: number) {
  for (let r = firstRow; r <= lastRow; r++) {
    for (let c = 1; c <= 11; c++) {
      ws.getCell(r, c).border = THIN_BORDER;
    }
  }
}

/**
 * Build one SMAS-style grade sheet ("Bảng kết quả đánh giá môn … - lớp …")
 * inside the given workbook. Layout mirrors the Viettel SMAS import template:
 * ministry/school header, merged title, two-row table header with the
 * ĐĐG TX group spanning 4 columns.
 */
export function addSmasGradeSheet(
  workbook: ExcelJS.Workbook,
  input: SmasGradeSheetInput,
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet("Bang diem");
  const roman = SEMESTER_ROMAN[input.semester] ?? String(input.semester);

  ws.columns = [
    { key: "stt", width: 6 },
    { key: "code", width: 18 },
    { key: "name", width: 28 },
    { key: "tx1", width: 6 },
    { key: "tx2", width: 6 },
    { key: "tx3", width: 6 },
    { key: "tx4", width: 6 },
    { key: "gk", width: 8 },
    { key: "ck", width: 8 },
    { key: "tbm", width: 9 },
    { key: "comment", width: 40 },
  ];

  // Ministry + school block (top-left).
  ws.mergeCells("A1:D1");
  ws.mergeCells("A2:D2");
  ws.getCell("A1").value = "BỘ GIÁO DỤC VÀ ĐÀO TẠO";
  // School names may contain intentional line breaks — keep them.
  ws.getCell("A2").value = normalizeSchoolName(input.schoolName, {
    keepLineBreaks: false,
  }).toUpperCase();
  for (const addr of ["A1", "A2"]) {
    const cell = ws.getCell(addr);
    cell.font = { ...FONT, bold: true };
    cell.alignment = { ...CENTER, wrapText: true };
  }

  // Title + semester lines, centered across the table.
  ws.mergeCells("A4:K4");
  const title = ws.getCell("A4");
  title.value = `BẢNG KẾT QUẢ ĐÁNH GIÁ MÔN ${input.subjectName.toUpperCase()} - LỚP ${input.className.toUpperCase()}`;
  title.font = { ...FONT, bold: true, size: 13 };
  title.alignment = CENTER;

  ws.mergeCells("A5:K5");
  const subtitle = ws.getCell("A5");
  subtitle.value = `Học kỳ ${roman} - Năm học ${input.schoolYear}`;
  subtitle.font = FONT;
  subtitle.alignment = CENTER;

  // Two-row table header (rows 7–8).
  ws.mergeCells("A7:A8");
  ws.mergeCells("B7:B8");
  ws.mergeCells("C7:C8");
  ws.mergeCells("D7:G7");
  ws.mergeCells("H7:H8");
  ws.mergeCells("I7:I8");
  ws.mergeCells("J7:J8");
  ws.mergeCells("K7:K8");

  ws.getCell("A7").value = "STT";
  ws.getCell("B7").value = "Mã học sinh";
  ws.getCell("C7").value = "Họ và tên";
  ws.getCell("D7").value = "ĐĐG TX";
  ws.getCell("D8").value = 1;
  ws.getCell("E8").value = 2;
  ws.getCell("F8").value = 3;
  ws.getCell("G8").value = 4;
  ws.getCell("H7").value = "ĐĐG GK";
  ws.getCell("I7").value = "ĐĐG CK";
  ws.getCell("J7").value = `TBM HK${roman}`;
  ws.getCell("K7").value = `Nhận xét HK${roman}`;

  for (let r = 7; r <= 8; r++) {
    for (let c = 1; c <= 11; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { ...FONT, bold: true };
      cell.alignment = { ...CENTER, wrapText: true };
    }
  }
  ws.getRow(7).height = 20;
  ws.getRow(8).height = 20;

  // Data rows.
  const firstDataRow = 9;
  input.rows.forEach((row, i) => {
    const r = firstDataRow + i;
    const values: (string | number | null)[] = [
      i + 1,
      row.studentCode,
      row.fullName,
      row.scores.tx1,
      row.scores.tx2,
      row.scores.tx3,
      row.scores.tx4,
      row.scores.gk,
      row.scores.ck,
      row.average,
      row.comment || null,
    ];
    values.forEach((value, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = value;
      cell.font = FONT;
      cell.alignment =
        c === 2 || c === 10
          ? { vertical: "middle", wrapText: c === 10 }
          : CENTER;
    });
  });

  borderRange(ws, 7, firstDataRow + Math.max(input.rows.length, 1) - 1);
  return ws;
}
