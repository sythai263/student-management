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
import { REPORT_CARD_FIELD_LABEL, REPORT_CARD_FIELDS } from "@lib/report-card";
import type {
  LetterheadRatio,
  ReportCardBlock,
  ReportCardFieldKey,
} from "@types";

interface BlockInspectorProps {
  block: ReportCardBlock;
  onChange: (block: ReportCardBlock) => void;
}

const GROUPS = Array.from(new Set(REPORT_CARD_FIELDS.map((f) => f.group)));

const LETTERHEAD_RATIO_LABEL: Record<LetterheadRatio, string> = {
  "1-3": "Trường 1/4 - Quốc hiệu 3/4",
  "1-2": "Trường 1/3 - Quốc hiệu 2/3",
  "2-3": "Trường 2/5 - Quốc hiệu 3/5",
  "1-1": "Trường 1/2 - Quốc hiệu 1/2",
  "2-1": "Trường 2/3 - Quốc hiệu 1/3",
  "3-1": "Trường 3/4 - Quốc hiệu 1/4",
};

const SIGNATURE_RATIO_LABEL: Record<LetterheadRatio, string> = {
  "1-3": "Nhận xét 1/4 - Chữ ký 3/4",
  "1-2": "Nhận xét 1/3 - Chữ ký 2/3",
  "2-3": "Nhận xét 2/5 - Chữ ký 3/5",
  "1-1": "Nhận xét 1/2 - Chữ ký 1/2",
  "2-1": "Nhận xét 2/3 - Chữ ký 1/3",
  "3-1": "Nhận xét 3/4 - Chữ ký 1/4",
};

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
        <SelectValue placeholder="Chọn field">
          {(v: ReportCardFieldKey) => REPORT_CARD_FIELD_LABEL[v] ?? "Chọn field"}
        </SelectValue>
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
              <SelectValue>{(v: string) => `${v} cột`}</SelectValue>
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

        <div className="space-y-2">
          <Label>Căn lề</Label>
          <Select
            value={block.align ?? "left"}
            onValueChange={(v) =>
              onChange({ ...block, align: (v ?? "left") as "left" | "center" })
            }
          >
            <SelectTrigger>
              <SelectValue>
                {(v: string) => (v === "center" ? "Giữa" : "Trái")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Trái</SelectItem>
              <SelectItem value="center">Giữa</SelectItem>
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
        <div className="space-y-2">
          <Label>Nhận xét cùng hàng</Label>
          <Select
            value={block.showComment ? "yes" : "no"}
            onValueChange={(v) =>
              onChange({ ...block, showComment: v === "yes" })
            }
          >
            <SelectTrigger>
              <SelectValue>
                {(v: string) => (v === "yes" ? "Có" : "Không")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Có</SelectItem>
              <SelectItem value="no">Không</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {block.showComment && (
          <>
            <div className="space-y-2">
              <Label>Nhãn nhận xét</Label>
              <Input
                value={block.commentLabel ?? ""}
                onChange={(e) =>
                  onChange({ ...block, commentLabel: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tỉ lệ bố trí</Label>
              <Select
                value={block.ratio ?? "2-1"}
                onValueChange={(v) =>
                  onChange({ ...block, ratio: (v ?? "2-1") as LetterheadRatio })
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => SIGNATURE_RATIO_LABEL[v as LetterheadRatio]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SIGNATURE_RATIO_LABEL) as LetterheadRatio[]).map(
                    (ratio) => (
                      <SelectItem key={ratio} value={ratio}>
                        {SIGNATURE_RATIO_LABEL[ratio]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Tên giáo viên tự điền ngay dưới chữ ký.
        </p>
      </div>
    );
  }

  if (block.type === "letterhead") {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Tên trường</Label>
          <Input
            value={block.schoolName}
            onChange={(e) => onChange({ ...block, schoolName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Tiêu đề phiếu</Label>
          <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Tỉ lệ bố trí</Label>
          <Select
            value={block.ratio ?? "1-2"}
            onValueChange={(v) =>
              onChange({ ...block, ratio: (v ?? "1-2") as LetterheadRatio })
            }
          >
            <SelectTrigger>
              <SelectValue>
                {(v: string) => LETTERHEAD_RATIO_LABEL[v as LetterheadRatio]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LETTERHEAD_RATIO_LABEL) as LetterheadRatio[]).map(
                (ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {LETTERHEAD_RATIO_LABEL[ratio]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Quốc hiệu, tiêu ngữ dùng font Times New Roman theo đúng thể thức văn bản, không chỉnh được.
        </p>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Khối này không có tùy chọn.</p>;
}
