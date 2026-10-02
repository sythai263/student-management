"use client";

import { useState } from "react";
import { BookOpen, Medal, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";
import { ListSkeleton } from "../ui/list-skeleton";
import { Skeleton } from "../ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { useClassSubjects, useHonorRoll } from "@hooks";
import { GRADE_GROUP_LABEL } from "@constants";
import type { HonorRollEntry } from "@types";

const TOP_N = 5;

/** Gold / silver / bronze for ranks 1-3; plain muted badge for 4-5. */
const RANK_STYLES = [
  "border-amber-400/60 bg-amber-400/15 text-amber-300",
  "border-slate-300/50 bg-slate-300/10 text-slate-200",
  "border-orange-400/50 bg-orange-400/10 text-orange-300",
];

function ScoreTooltip({ entry }: { entry: HonorRollEntry }) {
  const lines = [
    { label: GRADE_GROUP_LABEL.tx, count: entry.tx9, weight: 1 },
    { label: GRADE_GROUP_LABEL.gk, count: entry.gk9, weight: 2 },
    { label: GRADE_GROUP_LABEL.ck, count: entry.ck9, weight: 3 },
  ];
  return (
    <>
      {lines.map((l) => (
        <span key={l.label}>
          {l.label}: {l.count} điểm ≥ 9 (hệ số {l.weight})
        </span>
      ))}
    </>
  );
}

interface HonorRollProps {
  classId: string;
  subjectId?: string;
  subjectName?: string;
}

/** Golden honor board — top students by weighted count of >= 9 scores. */
export function HonorRoll({
  classId,
  subjectId: subjectIdProp,
  subjectName: subjectNameProp,
}: HonorRollProps) {
  const { data: classSubjects, isLoading: subjectsLoading } =
    useClassSubjects(classId);
  const [subjectId, setSubjectId] = useState(subjectIdProp ?? "");
  const [semester, setSemester] = useState(1);

  const subjectOptions = (classSubjects ?? []).map((cs) => ({
    id: cs.subjectId,
    name: cs.subjects?.name ?? "",
  }));

  const isLocked = !!subjectIdProp;
  const selectedSubject = isLocked
    ? { id: subjectIdProp, name: subjectNameProp ?? "" }
    : (subjectOptions.find((s) => s.id === subjectId) ?? subjectOptions[0]);

  const activeSubjectId = selectedSubject?.id ?? "";

  const { data: entries, isLoading } = useHonorRoll(
    classId,
    activeSubjectId,
    semester,
    TOP_N,
  );

  return (
    <Card className="border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-400" />
          Bảng vàng vinh danh
        </CardTitle>
        <CardDescription>
          Top {TOP_N} học sinh có nhiều điểm ≥ 9 nhất
          {selectedSubject?.name ? ` — ${selectedSubject.name}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="honor-subject">Môn học</Label>
            {subjectsLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : isLocked ? (
              <p
                id="honor-subject"
                className="rounded-md border p-2 text-sm font-medium"
              >
                {selectedSubject?.name}
              </p>
            ) : !subjectOptions.length ? (
              <p className="text-sm text-destructive">
                Lớp chưa được gán môn học nào.
              </p>
            ) : (
              <Select
                value={activeSubjectId}
                onValueChange={(v) => setSubjectId(v ?? "")}
              >
                <SelectTrigger id="honor-subject">
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="honor-semester">Học kỳ</Label>
            <Select
              value={String(semester)}
              onValueChange={(v) => setSemester(Number(v))}
            >
              <SelectTrigger id="honor-semester">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Học kỳ 1</SelectItem>
                <SelectItem value="2">Học kỳ 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton rows={TOP_N} itemClassName="h-10" />
        ) : !selectedSubject ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen />
              </EmptyMedia>
              <EmptyTitle>Chọn môn học để xem bảng vàng.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : !entries?.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Medal />
              </EmptyMedia>
              <EmptyTitle>Chưa có học sinh đạt điểm 9 trở lên.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <TooltipProvider>
            <ol className="space-y-2">
              {entries.map((e, index) => (
                <li
                  key={e.studentId}
                  className="flex items-center gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${RANK_STYLES[index] ?? "border-border bg-muted text-muted-foreground"
                      }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.studentName}
                    </p>
                    {e.studentCode ? (
                      <p className="text-xs text-muted-foreground">
                        {e.studentCode}
                      </p>
                    ) : null}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help rounded-full border border-amber-400/40 bg-amber-400/15 px-2.5 py-0.5 text-sm font-bold text-amber-300 tabular-nums">
                        {e.score}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="flex-col items-start gap-0.5">
                      <ScoreTooltip entry={e} />
                    </TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ol>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
