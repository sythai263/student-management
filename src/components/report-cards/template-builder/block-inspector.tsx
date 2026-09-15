import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REPORT_CARD_FIELDS } from "@lib/report-card";
import type { ReportCardBlock, ReportCardFieldKey } from "@types";

interface BlockInspectorProps {
  block: ReportCardBlock;
  onChange: (block: ReportCardBlock) => void;
}

const GROUPS = Array.from(new Set(REPORT_CARD_FIELDS.map((f) => f.group)));

/** Field picker — always a dropdown from the fixed catalogue, never free text. */
function FieldSelect({
  value,
  onChange,
}: {
  value: ReportCardFieldKey;
  onChange: (field: ReportCardFieldKey) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as ReportCardFieldKey)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Chọn field" />
      </SelectTrigger>
      <SelectContent>
        {GROUPS.map((group) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {REPORT_CARD_FIELDS.filter((f) => f.group === group).map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Property panel for the currently selected block. */
export function BlockInspector({ block, onChange }: BlockInspectorProps) {
  if (block.type === "fieldRow") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Số cột</Label>
          <Select
            value={String(block.columns)}
            onValueChange={(v) =>
              onChange({ ...block, columns: Number(v ?? 1) as 1 | 2 | 3 | 4 })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} cột
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {block.items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-md border p-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Ô {i + 1}</Label>
                {block.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      onChange({
                        ...block,
                        items: block.items.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <FieldSelect
                value={item.field}
                onChange={(field) =>
                  onChange({
                    ...block,
                    items: block.items.map((it, idx) =>
                      idx === i ? { ...it, field } : it,
                    ),
                  })
                }
              />
              <Input
                placeholder="Nhãn hiển thị (vd: Mã HS)"
                value={item.label}
                onChange={(e) =>
                  onChange({
                    ...block,
                    items: block.items.map((it, idx) =>
                      idx === i ? { ...it, label: e.target.value } : it,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...block,
              items: [...block.items, { field: "studentName", label: "Nhãn" }],
            })
          }
        >
          <Plus /> Thêm ô
        </Button>
      </div>
    );
  }

  if (block.type === "average") {
    return (
      <div className="space-y-2">
        <Label>Nhãn</Label>
        <Input value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
        <p className="text-xs text-muted-foreground">
          Giá trị luôn lấy từ điểm trung bình đã tính (làm tròn 2 số thập phân).
        </p>
      </div>
    );
  }

  if (block.type === "comment") {
    return (
      <div className="space-y-2">
        <Label>Nhãn</Label>
        <Input value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
      </div>
    );
  }

  if (block.type === "signature") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Nhãn ngày ký</Label>
          <Input
            value={block.dateLabel}
            onChange={(e) => onChange({ ...block, dateLabel: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Nhãn vai trò</Label>
          <Input
            value={block.roleLabel}
            onChange={(e) => onChange({ ...block, roleLabel: e.target.value })}
          />
        </div>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Đường kẻ không có tùy chọn.</p>;
}
