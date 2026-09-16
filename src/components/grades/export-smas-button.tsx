"use client";

import { useTransition } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchClass } from "@hooks/classes";
import { GRADE_SLOTS, type GradeSlot } from "@constants";
import { calculateAverage, parseScoreInput } from "@lib/grade-utils";
import { friendlyErrorMessage } from "@lib/utils";
import type { Student } from "@types";

interface ScoreInput {
  tx1: string;
  tx2: string;
  tx3: string;
  tx4: string;
  gk: string;
  ck: string;
  note: string;
  comment: string;
}

interface ExportSmasButtonProps {
  classId: string;
  subjectName: string;
  semester: number;
  students: Student[];
  entries: Record<string, ScoreInput>;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function ExportSmasButton({
  classId,
  subjectName,
  semester,
  students,
  entries,
}: ExportSmasButtonProps) {
  const [isPending, startTransition] = useTransition();

  function onExport() {
    startTransition(async () => {
      try {
        const [{ default: ExcelJS }, { addSmasGradeSheet }, cls] =
          await Promise.all([
            import("exceljs"),
            import("@lib/excel"),
            fetchClass(classId),
          ]);

        const rows = students.map((s) => {
          const input = entries[s.id];
          const scores = Object.fromEntries(
            GRADE_SLOTS.map((slot) => [
              slot,
              parseScoreInput(input?.[slot] ?? "").value,
            ]),
          ) as Record<GradeSlot, number | null>;
          return {
            studentCode: s.studentCode,
            fullName: `${s.lastName} ${s.firstName}`,
            scores,
            average: calculateAverage(scores),
            comment: input?.comment.trim() ?? "",
          };
        });

        const workbook = new ExcelJS.Workbook();
        addSmasGradeSheet(workbook, {
          schoolName: cls.school?.name ?? "",
          subjectName,
          className: cls.classCode || cls.name,
          schoolYear: cls.schoolYear,
          semester,
          rows,
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer as BlobPart], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bang_diem_${slugify(subjectName)}_${slugify(cls.classCode || cls.name)}_hk${semester}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(friendlyErrorMessage(err));
      }
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onExport}
      disabled={isPending || students.length === 0}
    >
      <FileDown />
      {isPending ? "Đang xuất..." : "Xuất Excel SMAS"}
    </Button>
  );
}
