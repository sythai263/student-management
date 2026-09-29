"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  resolveSkippedStudents,
  type SkippedStudentGroup,
} from "@lib/actions";
import { studentFullName } from "@lib/string";

interface SkippedStudentsDialogProps {
  classId: string;
  groups: SkippedStudentGroup[];
  /** Close without resolving — clears the pending groups. */
  onDismiss: () => void;
  /** Called after rows resolve successfully — invalidate + clear. */
  onResolved: () => Promise<void>;
}

/** Map duplicate-name file rows to existing students or create new ones. */
export function SkippedStudentsDialog({
  classId,
  groups,
  onDismiss,
  onResolved,
}: SkippedStudentsDialogProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [prevGroups, setPrevGroups] =
    useState<SkippedStudentGroup[]>(groups);
  const [isResolving, startResolve] = useTransition();

  // Drop stale row→student mappings when a new import result arrives.
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    setMappings({});
  }

  function onConfirm() {
    const rows = groups.flatMap((g, gi) =>
      g.fileRows.map((r, i) => {
        const mapped = mappings[`${gi}-${i}`];
        return {
          lastName: r.lastName,
          firstName: r.firstName,
          nameSuffix: r.nameSuffix,
          dateOfBirth: r.dateOfBirth,
          existingStudentId:
            mapped && mapped !== "__new__" ? mapped : null,
          assignedSuffix: String.fromCharCode(65 + i),
        };
      }),
    );
    startResolve(async () => {
      const res = await resolveSkippedStudents({ classId, rows });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const { inserted, updated } = res.data;
      toast.success(`Đã thêm ${inserted}, cập nhật ${updated} học sinh`);
      await onResolved();
    });
  }

  return (
    <Dialog
      open={groups.length > 0}
      onOpenChange={(o) => {
        if (!o) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Học sinh trùng tên — chọn cách xử lý</DialogTitle>
          <DialogDescription>
            Ghép từng dòng với học sinh đã có trong lớp, hoặc để
            &quot;Tạo học sinh mới&quot; — học sinh mới được lưu kèm ký
            hiệu để phân biệt.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên trong tệp</TableHead>
                <TableHead>Ngày sinh</TableHead>
                <TableHead>Ghép với học sinh trong lớp</TableHead>
                <TableHead>Ký hiệu</TableHead>
                <TableHead>Tên học sinh mới</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.flatMap((g, gi) =>
                g.fileRows.map((r, i) => {
                  const key = `${gi}-${i}`;
                  const mapped = mappings[key];
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">
                        {studentFullName(r)}
                      </TableCell>
                      <TableCell>{r.dateOfBirth ?? "—"}</TableCell>
                      <TableCell>
                        {g.existing.length > 0 ? (
                          <Select
                            value={mapped ?? "__new__"}
                            onValueChange={(v) =>
                              setMappings((m) => ({ ...m, [key]: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__new__">
                                — Tạo học sinh mới —
                              </SelectItem>
                              {g.existing
                                .filter(
                                  (e) =>
                                    !Object.entries(mappings).some(
                                      ([k, v]) => k !== key && v === e.id,
                                    ),
                                )
                                .map((e) => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {studentFullName(e)}
                                    {e.studentCode
                                      ? ` · ${e.studentCode}`
                                      : ""}
                                    {e.dateOfBirth
                                      ? ` · ${e.dateOfBirth}`
                                      : ""}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">
                            Tạo học sinh mới
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-amber-500">
                        {mapped && mapped !== "__new__"
                          ? "—"
                          : (r.nameSuffix ?? String.fromCharCode(65 + i))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mapped && mapped !== "__new__"
                          ? "—"
                          : studentFullName({
                            lastName: r.lastName,
                            firstName: r.firstName,
                            nameSuffix:
                              r.nameSuffix ??
                              String.fromCharCode(65 + i),
                          })}
                      </TableCell>
                    </TableRow>
                  );
                }),
              )}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDismiss}>
            Bỏ qua
          </Button>
          <Button
            type="button"
            disabled={isResolving}
            onClick={onConfirm}
          >
            {isResolving ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
