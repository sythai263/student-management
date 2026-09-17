"use client";

import { useRef, useState, useTransition, type SubmitEventHandler } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  importStudents,
  resolveSkippedStudents,
  type SkippedStudentGroup,
} from "@lib/actions";
import { studentFullName } from "@lib/string";
import { useClass } from "@hooks";

interface ImportStudentsFormProps {
  classId: string;
}

export function ImportStudentsForm({ classId }: ImportStudentsFormProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [skippedGroups, setSkippedGroups] = useState<SkippedStudentGroup[]>(
    [],
  );
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [isResolving, startResolve] = useTransition();
  const { data: classData } = useClass(classId);

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Vui lòng chọn tệp danh sách học sinh");
      return;
    }

    startTransition(async () => {
      const fd = new FormData(e.currentTarget);
      fd.set("classId", classId);
      fd.set("file", file);
      fd.set("matchBy", "name");
      fd.set("importMode", importMode);

      const result = await importStudents(fd);
      if (result.success) {
        const { inserted, updated, deleted, skipped } = result.data;
        toast.success(
          `Đã thêm ${inserted}, cập nhật ${updated}` +
          (deleted > 0 ? `, xóa ${deleted}` : "") +
          " học sinh",
        );
        if (skipped.length > 0) {
          setSkippedGroups(skipped);
        }
      } else {
        toast.error(result.error);
      }
      if (result.success) {
        if (fileRef.current) fileRef.current.value = "";
        await queryClient.invalidateQueries({
          queryKey: ["students", classId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["attendance-missing", classId],
        });
        setOpen(false);
      }
    });
  };

  function downloadTemplate() {
    const rows = [
      "STT,Họ đệm,Tên,Ngày sinh",
      "1,Nguyễn Văn,An,2010-03-15",
      "2,Trần Thị,Bình,15/03/2010",
      "3,Lê Hoàng,Cường,",
      "4,Phạm Minh,Đức,2010-01-20",
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau_danh_sach_hoc_sinh.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        <FileUp /> Thêm học sinh từ tệp
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm học sinh từ tệp</DialogTitle>
            <DialogDescription>
              {classData
                ? `Lớp: ${classData.name} (${classData.classCode}) - Năm học ${classData.schoolYear}`
                : "Tải lên tệp danh sách để thêm nhiều học sinh cùng lúc"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">Tệp danh sách học sinh (.csv)</Label>
              <Input id="csv" ref={fileRef} type="file" accept=".csv,text/csv" />
              <p className="text-xs text-muted-foreground">
                Tệp 4 cột: STT, Họ đệm, Tên, Ngày sinh — mã HS tự cấp theo
                mã lớp. Chấp nhận cả tệp 2 cột: STT, Họ và tên.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-mode">Chế độ nhập</Label>
              <Select
                value={importMode}
                onValueChange={(v) => setImportMode(v as "append" | "replace")}
              >
                <SelectTrigger id="import-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">
                    Thêm vào danh sách hiện có
                  </SelectItem>
                  <SelectItem value="replace">
                    Thay thế toàn bộ danh sách
                  </SelectItem>
                </SelectContent>
              </Select>
              {importMode === "replace" && (
                <p className="text-xs text-destructive">
                  Học sinh không có trong tệp sẽ bị xóa khỏi lớp cùng toàn bộ
                  điểm danh và điểm số.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
              >
                Tải tệp mẫu
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang thêm..." : "Thêm vào lớp"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={skippedGroups.length > 0}
        onOpenChange={(o) => {
          if (!o) {
            setSkippedGroups([]);
            setMappings({});
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Học sinh trùng tên — chọn cách xử lý
            </DialogTitle>
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
                {skippedGroups.flatMap((g, gi) =>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSkippedGroups([]);
                setMappings({});
              }}
            >
              Bỏ qua
            </Button>
            <Button
              type="button"
              disabled={isResolving}
              onClick={() => {
                const rows = skippedGroups.flatMap((g, gi) =>
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
                  const res = await resolveSkippedStudents({
                    classId,
                    rows,
                  });
                  if (!res.success) {
                    toast.error(res.error);
                    return;
                  }
                  const { inserted, updated } = res.data;
                  toast.success(
                    `Đã thêm ${inserted}, cập nhật ${updated} học sinh`,
                  );
                  await queryClient.invalidateQueries({
                    queryKey: ["students", classId],
                  });
                  await queryClient.invalidateQueries({
                    queryKey: ["attendance-missing", classId],
                  });
                  setSkippedGroups([]);
                  setMappings({});
                });
              }}
            >
              {isResolving ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
