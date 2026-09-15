import { Columns3, MessageSquare, Minus, PenLine, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBlockId } from "@lib/report-card";
import type { ReportCardBlock } from "@types";

const PALETTE: { label: string; icon: typeof Columns3; build: () => ReportCardBlock }[] = [
  {
    label: "Hàng thông tin",
    icon: Columns3,
    build: () => ({
      id: createBlockId(),
      type: "fieldRow",
      columns: 1,
      items: [{ field: "studentName", label: "Nhãn" }],
    }),
  },
  {
    label: "Điểm trung bình",
    icon: Sigma,
    build: () => ({ id: createBlockId(), type: "average", label: "Điểm trung bình" }),
  },
  {
    label: "Nhận xét",
    icon: MessageSquare,
    build: () => ({ id: createBlockId(), type: "comment", label: "Nhận xét" }),
  },
  {
    label: "Chữ ký",
    icon: PenLine,
    build: () => ({
      id: createBlockId(),
      type: "signature",
      dateLabel: "Ngày ký",
      roleLabel: "Giáo viên",
    }),
  },
  {
    label: "Đường kẻ",
    icon: Minus,
    build: () => ({ id: createBlockId(), type: "divider" }),
  },
];

interface BlockPaletteProps {
  onAdd: (block: ReportCardBlock) => void;
}

/** Sidebar of block types — click to append to the end of the layout. */
export function BlockPalette({ onAdd }: BlockPaletteProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Thêm khối</p>
      <div className="grid grid-cols-2 gap-2">
        {PALETTE.map(({ label, icon: Icon, build }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            className="h-auto flex-col gap-1 py-3"
            onClick={() => onAdd(build())}
          >
            <Icon className="size-4" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
